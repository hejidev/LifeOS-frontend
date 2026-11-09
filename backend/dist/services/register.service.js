"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrent = getCurrent;
exports.open = open;
exports.addMovement = addMovement;
exports.close = close;
exports.history = history;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const num = (value) => (value == null ? 0 : Number(value));
const round = (value) => Math.round(value * 100) / 100;
async function breakdown(scope, from, to) {
    const rows = await prisma_1.prisma.salePayment.groupBy({
        by: ["method", "kind"],
        where: { bizProfileId: scope.bizProfileId, storeId: scope.storeId, createdAt: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: { _all: true },
    });
    let cashSales = 0;
    let cashCollections = 0;
    let cashRefunds = 0;
    let salesCount = 0;
    const other = new Map();
    for (const row of rows) {
        const amount = num(row._sum.amount);
        if (row.kind === "SALE")
            salesCount += row._count._all;
        if (row.method === "CASH") {
            if (row.kind === "SALE")
                cashSales += amount;
            else if (row.kind === "COLLECTION")
                cashCollections += amount;
            else
                cashRefunds += amount;
        }
        else {
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
function view(session, parts) {
    const movements = [...session.movements].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = (kind) => round(movements.filter((movement) => movement.kind === kind).reduce((sum, movement) => sum + num(movement.amount), 0));
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
        movements: movements.map((movement) => ({
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
async function getCurrent(scope) {
    const session = await prisma_1.prisma.cashSession.findFirst({ where: { ...scope, closedAt: null }, include: { movements: true } });
    if (!session)
        return null;
    return view(session, await breakdown(scope, session.openedAt, new Date()));
}
async function open(scope, actor, openingFloat) {
    try {
        await prisma_1.prisma.cashSession.create({
            data: {
                ...scope,
                openKey: scope.storeId,
                openedByType: actor.type,
                openedById: actor.id,
                openedByName: actor.name,
                openingFloat: round(openingFloat),
            },
        });
    }
    catch (err) {
        if (err?.code === "P2002")
            throw new errors_1.AppError("A register is already open at this location.", 409);
        throw err;
    }
    return getCurrent(scope);
}
async function addMovement(scope, actor, input) {
    const current = await getCurrent(scope);
    if (!current)
        throw new errors_1.AppError("Open the register first.", 409);
    if (input.kind === "PAY_OUT" && input.amount > current.cash.expected) {
        throw new errors_1.AppError(`The drawer only has ${current.cash.expected}, so you can't pay out ${round(input.amount)}.`, 409);
    }
    await prisma_1.prisma.cashMovement.create({
        data: { sessionId: current.id, kind: input.kind, amount: round(input.amount), reason: input.reason, actorName: actor.name },
    });
    return getCurrent(scope);
}
async function close(scope, actor, input) {
    const session = await prisma_1.prisma.cashSession.findFirst({ where: { ...scope, closedAt: null }, include: { movements: true } });
    if (!session)
        throw new errors_1.AppError("No register is open at this location.", 409);
    const closedAt = new Date();
    const parts = await breakdown(scope, session.openedAt, closedAt);
    const expected = view(session, parts).cash.expected;
    const counted = round(input.countedCash);
    const variance = round(counted - expected);
    const note = input.note?.trim() || null;
    const claimed = await prisma_1.prisma.cashSession.updateMany({
        where: { id: session.id, closedAt: null },
        data: { closedAt, openKey: null, closedByName: actor.name, expectedCash: expected, countedCash: counted, variance, note },
    });
    if (claimed.count === 0)
        throw new errors_1.AppError("This register was already closed.", 409);
    return view({ ...session, closedAt, closedByName: actor.name, countedCash: counted, variance, note }, parts);
}
async function history(scope, take = 30) {
    const sessions = await prisma_1.prisma.cashSession.findMany({
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
