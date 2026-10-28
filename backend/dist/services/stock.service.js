"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustStock = adjustStock;
exports.listMovements = listMovements;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const storeService = __importStar(require("./store.service"));
const notification_service_1 = require("./notification.service");
function serializeMovement(movement) {
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
async function adjustStock(input) {
    const { userId, productId, delta, reason, note, actor } = input;
    if (!Number.isInteger(delta) || delta === 0)
        throw new errors_1.AppError("Enter a quantity above zero.", 400);
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId }, select: { id: true, notifyLowStock: true } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    const storeId = await storeService.resolveStoreId(userId, input.storeId);
    const product = await prisma_1.prisma.bizProduct.findFirst({
        where: { id: productId, userId, active: true },
        select: { name: true, lowStockAt: true },
    });
    if (!product)
        throw new errors_1.AppError("Product not found", 404);
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const key = { storeId_productId: { storeId, productId } };
        const existing = await tx.storeInventory.findUnique({ where: key });
        const before = existing?.stock ?? 0;
        const lowStockAt = existing?.lowStockAt ?? product.lowStockAt;
        if (!existing)
            await tx.storeInventory.create({ data: { storeId, productId, stock: 0, lowStockAt } });
        if (delta < 0) {
            const moved = await tx.storeInventory.updateMany({
                where: { storeId, productId, stock: { gte: -delta } },
                data: { stock: { decrement: -delta } },
            });
            if (moved.count === 0)
                throw new errors_1.AppError(`Only ${before} in stock, so you can't remove ${-delta}.`, 409);
        }
        else {
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
        const store = await prisma_1.prisma.store.findUnique({ where: { id: storeId }, select: { name: true } });
        await (0, notification_service_1.createNotification)(userId, {
            type: "ALERT",
            title: "Low stock alert",
            message: `${product.name} is running low${store?.name ? ` at ${store.name}` : ""} — ${result.after.stock} left`,
            actionUrl: "/merchant/products",
        });
    }
    return { stock: result.after.stock, movement: serializeMovement(result.movement) };
}
async function listMovements(userId, productId, storeId, take = 50) {
    const resolved = await storeService.resolveStoreId(userId, storeId);
    const product = await prisma_1.prisma.bizProduct.findFirst({ where: { id: productId, userId }, select: { id: true } });
    if (!product)
        throw new errors_1.AppError("Product not found", 404);
    const rows = await prisma_1.prisma.stockMovement.findMany({
        where: { productId, storeId: resolved },
        orderBy: { createdAt: "desc" },
        take,
    });
    return rows.map(serializeMovement);
}
