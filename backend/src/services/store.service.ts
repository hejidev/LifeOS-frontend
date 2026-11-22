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
  const name = data.name.trim();
  if (!name) throw new AppError("Give the location a name", 400);

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.create({
      data: { bizProfileId: profile.id, name, address: data.address?.trim() || null, phone: data.phone?.trim() || null },
    });

    const products = await tx.bizProduct.findMany({ where: { userId }, select: { id: true, lowStockAt: true } });
    if (products.length > 0) {
      await tx.storeInventory.createMany({
        data: products.map((p) => ({ storeId: store.id, productId: p.id, stock: 0, lowStockAt: p.lowStockAt })),
        skipDuplicates: true,
      });
    }
    return serializeStore(store);
  });
}

export async function updateStore(
  userId: string,
  storeId: string,
  data: { name?: string; address?: string; phone?: string; active?: boolean }
) {
  const profile = await getBizProfile(userId);
  const existing = await prisma.store.findFirst({ where: { id: storeId, bizProfileId: profile.id } });
  if (!existing) throw new AppError("Store not found", 404);

  if (data.active === false) {
    if (existing.isDefault) {
      throw new AppError("Can't deactivate your default location. Set another location as default first.", 400);
    }
    const staffHere = await prisma.bizStaff.count({ where: { storeId, status: "ACTIVE" } });
    if (staffHere > 0) {
      throw new AppError(`${staffHere} active staff ${staffHere === 1 ? "member is" : "members are"} assigned here. Move or suspend them first.`, 409);
    }
  }

  const store = await prisma.store.update({
    where: { id: storeId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() || existing.name }),
      ...(data.address !== undefined && { address: data.address.trim() || null }),
      ...(data.phone !== undefined && { phone: data.phone.trim() || null }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });
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