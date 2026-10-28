import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import * as storeService from "./store.service";
import { createNotification } from "./notification.service";

export type StockReason = "RECEIVED" | "DAMAGED" | "EXPIRED" | "COUNT_CORRECTION" | "RETURNED_TO_SUPPLIER" | "OTHER";

export interface StockActor {
  type: "OWNER" | "STAFF";
  id: string;
  name: string;
}

function serializeMovement(movement: {
  id: string;
  delta: number;
  stockAfter: number;
  reason: string;
  note: string | null;
  actorName: string;
  createdAt: Date;
}) {
  return {
    id: movement.id,
    delta: movement.delta,
    stockAfter: movement.stockAfter,
    reason: movement.reason,
    note: movement.note,
    actorName: movement.actorName,
    createdAt: movement.createdAt.toISOString(),
  };
}

export async function adjustStock(input: {
  userId: string;
  storeId?: string;
  productId: string;
  delta: number;
  reason: StockReason;
  note?: string;
  actor: StockActor;
}) {
  const { userId, productId, delta, reason, note, actor } = input;
  if (!Number.isInteger(delta) || delta === 0) throw new AppError("Enter a quantity above zero.", 400);

  const profile = await prisma.bizProfile.findUnique({ where: { userId }, select: { id: true, notifyLowStock: true } });
  if (!profile) throw new AppError("Merchant profile not found", 404);

  const storeId = await storeService.resolveStoreId(userId, input.storeId);
  const product = await prisma.bizProduct.findFirst({
    where: { id: productId, userId, active: true },
    select: { name: true, lowStockAt: true },
  });
  if (!product) throw new AppError("Product not found", 404);

  const result = await prisma.$transaction(async (tx) => {
    const key = { storeId_productId: { storeId, productId } };
    const existing = await tx.storeInventory.findUnique({ where: key });
    const before = existing?.stock ?? 0;
    const lowStockAt = existing?.lowStockAt ?? product.lowStockAt;
    if (!existing) await tx.storeInventory.create({ data: { storeId, productId, stock: 0, lowStockAt } });

    if (delta < 0) {
      const moved = await tx.storeInventory.updateMany({
        where: { storeId, productId, stock: { gte: -delta } },
        data: { stock: { decrement: -delta } },
      });
      if (moved.count === 0) throw new AppError(`Only ${before} in stock, so you can't remove ${-delta}.`, 409);
    } else {
      await tx.storeInventory.update({ where: key, data: { stock: { increment: delta } } });
    }

    const after = await tx.storeInventory.findUniqueOrThrow({ where: key });
    const movement = await tx.stockMovement.create({
      data: {
        bizProfileId: profile.id,
        storeId,
        productId,
        delta,
        stockAfter: after.stock,
        reason,
        note: note?.trim() || null,
        actorType: actor.type,
        actorId: actor.id,
        actorName: actor.name,
      },
    });
    return { before, after, lowStockAt, movement };
  });

  if (profile.notifyLowStock && result.before > result.lowStockAt && result.after.stock <= result.lowStockAt) {
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true } });
    await createNotification(userId, {
      type: "ALERT",
      title: "Low stock alert",
      message: `${product.name} is running low${store?.name ? ` at ${store.name}` : ""} — ${result.after.stock} left`,
      actionUrl: "/merchant/products",
    });
  }

  return { stock: result.after.stock, movement: serializeMovement(result.movement) };
}

export async function listMovements(userId: string, productId: string, storeId?: string, take = 50) {
  const resolved = await storeService.resolveStoreId(userId, storeId);
  const product = await prisma.bizProduct.findFirst({ where: { id: productId, userId }, select: { id: true } });
  if (!product) throw new AppError("Product not found", 404);

  const rows = await prisma.stockMovement.findMany({
    where: { productId, storeId: resolved },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(serializeMovement);
}