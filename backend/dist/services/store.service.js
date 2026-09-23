"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStores = listStores;
exports.createStore = createStore;
exports.updateStore = updateStore;
exports.setDefaultStore = setDefaultStore;
exports.resolveStoreId = resolveStoreId;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
async function getBizProfile(userId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    return profile;
}
function serializeStore(s) {
    return {
        id: s.id,
        name: s.name,
        address: s.address ?? undefined,
        phone: s.phone ?? undefined,
        isDefault: s.isDefault,
        active: s.active,
        createdAt: s.createdAt.toISOString(),
    };
}
async function listStores(userId) {
    const profile = await getBizProfile(userId);
    const stores = await prisma_1.prisma.store.findMany({
        where: { bizProfileId: profile.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return stores.map(serializeStore);
}
async function createStore(userId, data) {
    const profile = await getBizProfile(userId);
    const store = await prisma_1.prisma.store.create({
        data: { bizProfileId: profile.id, name: data.name, address: data.address, phone: data.phone },
    });
    const products = await prisma_1.prisma.bizProduct.findMany({ where: { userId }, select: { id: true, lowStockAt: true } });
    if (products.length > 0) {
        await prisma_1.prisma.storeInventory.createMany({
            data: products.map((p) => ({ storeId: store.id, productId: p.id, stock: 0, lowStockAt: p.lowStockAt })),
            skipDuplicates: true,
        });
    }
    return serializeStore(store);
}
async function updateStore(userId, storeId, data) {
    const profile = await getBizProfile(userId);
    const existing = await prisma_1.prisma.store.findFirst({ where: { id: storeId, bizProfileId: profile.id } });
    if (!existing)
        throw new errors_1.AppError("Store not found", 404);
    if (existing.isDefault && data.active === false) {
        throw new errors_1.AppError("Can't deactivate your default location — set another location as default first", 400);
    }
    const store = await prisma_1.prisma.store.update({ where: { id: storeId }, data });
    return serializeStore(store);
}
async function setDefaultStore(userId, storeId) {
    const profile = await getBizProfile(userId);
    const target = await prisma_1.prisma.store.findFirst({ where: { id: storeId, bizProfileId: profile.id } });
    if (!target)
        throw new errors_1.AppError("Store not found", 404);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.store.updateMany({ where: { bizProfileId: profile.id, isDefault: true }, data: { isDefault: false } }),
        prisma_1.prisma.store.update({ where: { id: storeId }, data: { isDefault: true, active: true } }),
    ]);
    return listStores(userId);
}
async function resolveStoreId(userId, requestedStoreId) {
    const profile = await getBizProfile(userId);
    if (requestedStoreId) {
        const store = await prisma_1.prisma.store.findFirst({ where: { id: requestedStoreId, bizProfileId: profile.id, active: true } });
        if (!store)
            throw new errors_1.AppError("Store not found or inactive", 404);
        return store.id;
    }
    const defaultStore = await prisma_1.prisma.store.findFirst({ where: { bizProfileId: profile.id, isDefault: true } });
    if (defaultStore)
        return defaultStore.id;
    throw new errors_1.AppError("No default store set for this business", 500);
}
