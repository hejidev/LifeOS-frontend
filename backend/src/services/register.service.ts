import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

const num = (value: unknown) => (value == null ? 0 : Number(value));
const round = (value: number) => Math.round(value * 100) / 100;

export interface RegisterScope {
  bizProfileId: string;
  storeId: string;
}

export interface RegisterActor {
  type: "OWNER" | "STAFF";
  id: string;
  name: string;
}

async function breakdown(scope: RegisterScope, from: Date, to: Date) {
  const rows = await prisma.salePayment.groupBy({
    by: ["method", "kind"],
    where: { bizProfileId: scope.bizProfileId, storeId: scope.storeId, createdAt: { gte: from, lte: to } },
    _sum: { amount: true },
    _count: { _all: true },
  });

  let cashSales = 0;
  let cashCollections = 0;
  let cashRefunds = 0;
  let salesCount = 0;
  const other = new Map<string, number>();

  for (const row of rows) {
    const amount = num(row._sum.amount);
    if (row.kind === "SALE") salesCount += row._count._all;
    if (row.method === "CASH") {
      if (row.kind === "SALE") cashSales += amount;
      else if (row.kind === "COLLECTION") cashCollections += amount;
      else cashRefunds += amount;
    } else {
      other.set(row.method, (other.get(row.method) ?? 0) + amount);
    }
  }

  return {
    cashSales,
    cashCollections,
    cashRefunds,
    salesCount,
    other: [...other].map(([method, total]) => ({ method, total: round(total) })).sort((a, b) => b.total - a.total),
  };
}

type Parts = Awaited<ReturnType<typeof breakdown>>;

function view(session: any, parts: Parts) {
  const movements = [...session.movements].sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
  const total = (kind: string) =>
    round(movements.filter((movement: any) => movement.kind === kind).reduce((sum: number, movement: any) => sum + num(movement.amount), 0));
  const payIns = total("PAY_IN");
  const payOuts = total("PAY_OUT");

  return {
    id: session.id,
    storeId: session.storeId,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt ? session.closedAt.toISOString() : null,
    openedByName: session.openedByName,
    closedByName: session.closedByName ?? null,
    openingFloat: num(session.openingFloat),
    cash: {
      sales: round(parts.cashSales),
      collections: round(parts.cashCollections),
      refunds: round(parts.cashRefunds),
      payIns,
      payOuts,
      expected: round(num(session.openingFloat) + parts.cashSales + parts.cashCollections + parts.cashRefunds + payIns - payOuts),
    },
    other: parts.other,
    salesCount: parts.salesCount,
    movements: movements.map((movement: any) => ({
      id: movement.id,
      kind: movement.kind,
      amount: num(movement.amount),
      reason: movement.reason,
      actorName: movement.actorName,
      createdAt: movement.createdAt.toISOString(),
    })),
    counted: session.countedCash == null ? null : num(session.countedCash),
    variance: session.variance == null ? null : num(session.variance),
    note: session.note ?? null,
  };
}

export async function getCurrent(scope: RegisterScope) {
  const session = await prisma.cashSession.findFirst({ where: { ...scope, closedAt: null }, include: { movements: true } });
  if (!session) return null;
  return view(session, await breakdown(scope, session.openedAt, new Date()));
}

export async function open(scope: RegisterScope, actor: RegisterActor, openingFloat: number) {
  try {
    await prisma.cashSession.create({
      data: {
        ...scope,
        openKey: scope.storeId,
        openedByType: actor.type,
        openedById: actor.id,
        openedByName: actor.name,
        openingFloat: round(openingFloat),
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") throw new AppError("A register is already open at this location.", 409);
    throw err;
  }
  return getCurrent(scope);
}

export async function addMovement(scope: RegisterScope, actor: RegisterActor, input: { kind: "PAY_IN" | "PAY_OUT"; amount: number; reason: string }) {
  const current = await getCurrent(scope);
  if (!current) throw new AppError("Open the register first.", 409);
  if (input.kind === "PAY_OUT" && input.amount > current.cash.expected) {
    throw new AppError(`The drawer only has ${current.cash.expected}, so you can't pay out ${round(input.amount)}.`, 409);
  }
  await prisma.cashMovement.create({
    data: { sessionId: current.id, kind: input.kind, amount: round(input.amount), reason: input.reason, actorName: actor.name },
  });
  return getCurrent(scope);
}

export async function close(scope: RegisterScope, actor: RegisterActor, input: { countedCash: number; note?: string }) {
  const session = await prisma.cashSession.findFirst({ where: { ...scope, closedAt: null }, include: { movements: true } });
  if (!session) throw new AppError("No register is open at this location.", 409);

  const closedAt = new Date();
  const parts = await breakdown(scope, session.openedAt, closedAt);
  const expected = view(session, parts).cash.expected;
  const counted = round(input.countedCash);
  const variance = round(counted - expected);
  const note = input.note?.trim() || null;

  const claimed = await prisma.cashSession.updateMany({
    where: { id: session.id, closedAt: null },
    data: { closedAt, openKey: null, closedByName: actor.name, expectedCash: expected, countedCash: counted, variance, note },
  });
  if (claimed.count === 0) throw new AppError("This register was already closed.", 409);

  return view({ ...session, closedAt, closedByName: actor.name, countedCash: counted, variance, note }, parts);
}

export async function history(scope: RegisterScope, take = 30) {
  const sessions = await prisma.cashSession.findMany({
    where: { ...scope, closedAt: { not: null } },
    orderBy: { closedAt: "desc" },
    take,
  });
  return sessions.map((session) => ({
    id: session.id,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    openedByName: session.openedByName,
    closedByName: session.closedByName,
    openingFloat: num(session.openingFloat),
    expectedCash: num(session.expectedCash),
    countedCash: num(session.countedCash),
    variance: num(session.variance),
    note: session.note,
  }));
}