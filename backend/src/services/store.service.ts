import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

async function getBizProfile(userId: string) {
  const profile = await prisma.bizProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("Merchant profile not found", 404);
  return profile;
}

function serializeStore(s: any) {
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

export async function listStores(userId: string) {
  const profile = await getBizProfile(userId);
  const stores = await prisma.store.findMany({
    where: { bizProfileId: profile.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return stores.map(serializeStore);
}

export async function createStore(userId: string, data: { name: string; address?: string; phone?: string }) {
  const profile = await getBizProfile(userId);
  const store = await prisma.store.create({
    data: { bizProfileId: profile.id, name: data.name, address: data.address, phone: data.phone },
  });

  const products = await prisma.bizProduct.findMany({ where: { userId }, select: { id: true, lowStockAt: true } });
  if (products.length > 0) {
    await prisma.storeInventory.createMany({
      data: products.map((p) => ({ storeId: store.id, productId: p.id, stock: 0, lowStockAt: p.lowStockAt })),
      skipDuplicates: true,
    });
  }

  return serializeStore(store);
}

export async function updateStore(userId: string, storeId: string, data: { name?: string; address?: string; phone?: string; active?: boolean }) {
  const profile = await getBizProfile(userId);
  const existing = await prisma.store.findFirst({ where: { id: storeId, bizProfileId: profile.id } });
  if (!existing) throw new AppError("Store not found", 404);
  if (existing.isDefault && data.active === false) {
    throw new AppError("Can't deactivate your default location — set another location as default first", 400);
  }
  const store = await prisma.store.update({ where: { id: storeId }, data });
  return serializeStore(store);
}

export async function setDefaultStore(userId: string, storeId: string) {
  const profile = await getBizProfile(userId);
  const target = await prisma.store.findFirst({ where: { id: storeId, bizProfileId: profile.id } });
  if (!target) throw new AppError("Store not found", 404);

  await prisma.$transaction([
    prisma.store.updateMany({ where: { bizProfileId: profile.id, isDefault: true }, data: { isDefault: false } }),
    prisma.store.update({ where: { id: storeId }, data: { isDefault: true, active: true } }),
  ]);

  return listStores(userId);
}

export async function resolveStoreId(userId: string, requestedStoreId?: string): Promise<string> {
  const profile = await getBizProfile(userId);

  if (requestedStoreId) {
    const store = await prisma.store.findFirst({ where: { id: requestedStoreId, bizProfileId: profile.id, active: true } });
    if (!store) throw new AppError("Store not found or inactive", 404);
    return store.id;
  }

  const defaultStore = await prisma.store.findFirst({ where: { bizProfileId: profile.id, isDefault: true } });
  if (defaultStore) return defaultStore.id;

  throw new AppError("No default store set for this business", 500);
}