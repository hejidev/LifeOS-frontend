import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

const num = (value: unknown) => (value == null ? 0 : Number(value));

export async function listPending(userId: string, storeId?: string) {
  const sales = await prisma.bizSale.findMany({
    where: { userId, status: "PAID", confirmation: { in: ["AWAITING", "DISPUTED"] }, ...(storeId ? { storeId } : {}) },
    include: { store: { select: { name: true } }, customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const staffIds = [...new Set(sales.map((sale) => sale.staffId).filter((id): id is string => !!id))];
  const staff = staffIds.length ? await prisma.bizStaff.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(staff.map((member) => [member.id, member.name]));

  return sales.map((sale) => ({
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    total: num(sale.total),
    paymentMethod: sale.paymentMethod,
    paymentReference: sale.paymentReference,
    confirmation: sale.confirmation,
    staffName: sale.staffId ? names.get(sale.staffId) ?? "Former staff" : "Owner",
    customerName: sale.customer?.name ?? null,
    storeName: sale.store?.name ?? null,
    soldOffline: sale.soldOffline,
    reviewNotes: sale.reviewNotes,
    createdAt: sale.createdAt.toISOString(),
  }));
}

export async function getSummary(userId: string, storeId?: string) {
  const where = { userId, status: "PAID" as const, ...(storeId ? { storeId } : {}) };
  const [awaiting, disputed] = await Promise.all([
    prisma.bizSale.aggregate({ where: { ...where, confirmation: "AWAITING" }, _count: { _all: true }, _sum: { total: true } }),
    prisma.bizSale.aggregate({ where: { ...where, confirmation: "DISPUTED" }, _count: { _all: true }, _sum: { total: true } }),
  ]);
  return {
    awaitingCount: awaiting._count._all,
    awaitingTotal: num(awaiting._sum.total),
    disputedCount: disputed._count._all,
    disputedTotal: num(disputed._sum.total),
  };
}

export async function confirmSales(userId: string, ids: string[], actorName: string) {
  const result = await prisma.bizSale.updateMany({
    where: { id: { in: ids }, userId, status: "PAID", confirmation: { in: ["AWAITING", "DISPUTED"] } },
    data: { confirmation: "CONFIRMED", confirmedAt: new Date(), confirmedByName: actorName },
  });
  if (result.count === 0) throw new AppError("Nothing to confirm. These payments may already be confirmed.", 409);
  return { confirmed: result.count };
}

export async function disputeSale(userId: string, id: string, reason: string, actorName: string) {
  const sale = await prisma.bizSale.findFirst({ where: { id, userId, status: "PAID", confirmation: "AWAITING" } });
  if (!sale) throw new AppError("This payment isn't waiting for confirmation.", 404);

  const note = `Payment disputed by ${actorName}: ${reason}`;
  await prisma.bizSale.update({
    where: { id },
    data: { confirmation: "DISPUTED", needsReview: true, reviewNotes: sale.reviewNotes ? `${sale.reviewNotes}\n${note}` : note },
  });
  return { ok: true };
}