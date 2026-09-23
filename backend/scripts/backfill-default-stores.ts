//backend/scripts/backfill-default-stores.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.bizProfile.findMany();

  for (const profile of profiles) {
    let store = await prisma.store.findFirst({
      where: { bizProfileId: profile.id, isDefault: true },
    });

    if (!store) {
      store = await prisma.store.create({
        data: {
          bizProfileId: profile.id,
          name: profile.businessName,
          isDefault: true,
        },
      }); 
    }

    const products = await prisma.bizProduct.findMany({
      where: { userId: profile.userId },
    });

    for (const product of products) {
      await prisma.storeInventory.upsert({
        where: { storeId_productId: { storeId: store.id, productId: product.id } },
        update: {},
        create: {
          storeId: store.id,
          productId: product.id,
          stock: product.stock,
          lowStockAt: product.lowStockAt,
        },
      });
    }

    await prisma.bizSale.updateMany({
      where: { userId: profile.userId, storeId: null },
      data: { storeId: store.id },
    });

    await prisma.bizExpense.updateMany({
      where: { userId: profile.userId, storeId: null },
      data: { storeId: store.id },
    });

    await prisma.bizStaff.updateMany({
      where: { bizProfileId: profile.id, storeId: null },
      data: { storeId: store.id },
    });

    console.log(`Backfilled "${profile.businessName}" → store ${store.id} (${products.length} products)`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());