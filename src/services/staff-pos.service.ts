import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import * as businessService from "./business.service";
import * as staffPortalService from "./staff-portal.service";

async function resolveOwner(bizProfileId: string) {
  const profile = await prisma.bizProfile.findUnique({
    where: { id: bizProfileId },
    select: { userId: true, currency: true, paused: true },
  });
  if (!profile) throw new AppError("Store not found", 404);
  if (profile.paused) throw new AppError("This store is currently paused", 403);
  return profile;
}

export async function getProducts(bizProfileId: string, storeId: string) {
  const { userId } = await resolveOwner(bizProfileId);
  return businessService.listProducts(userId, true, storeId);
}

export async function getCustomers(bizProfileId: string) {
  const { userId } = await resolveOwner(bizProfileId);
  return businessService.listCustomers(userId);
}

export async function createCustomer(bizProfileId: string, data: any) {
  const { userId } = await resolveOwner(bizProfileId);
  return businessService.createCustomer(userId, data);
}

export async function createSale(staffId: string, bizProfileId: string, storeId: string, data: any) {
  const { userId, currency } = await resolveOwner(bizProfileId);
  const { discount: _discount, items, clientRequestId, ...saleData } = data;

  if (clientRequestId) {
    const existing = await businessService.findSaleByRequestId(userId, clientRequestId);
    if (existing) return existing;
  }

  const productIds: string[] = items.map((item: any) => item.productId).filter(Boolean);
  if (productIds.length !== items.length) {
    throw new AppError("Every item must be a product from the catalog", 400);
  }

  const products = await prisma.bizProduct.findMany({
    where: { id: { in: productIds }, userId, active: true },
    select: { id: true, name: true, price: true },
  });
  const catalog = new Map(products.map((product) => [product.id, product]));

  const pricedItems = items.map((item: any) => {
    const product = catalog.get(item.productId);
    if (!product) throw new AppError("One of the items is no longer available", 400);
    return {
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice: Number(product.price),
    };
  });

  let sale: Awaited<ReturnType<typeof businessService.createSale>>;
  try {
    sale = await businessService.createSale(
      userId,
      { ...saleData, items: pricedItems, discount: 0, status: "PAID", clientRequestId },
      storeId
    );
  } catch (err: any) {
    if (err?.code === "P2002" && clientRequestId) {
      const existing = await businessService.findSaleByRequestId(userId, clientRequestId);
      if (existing) return existing;
    }
    throw err;
  }

  await staffPortalService.logSelfActivity(
    staffId,
    bizProfileId,
    "SALE_CREATED",
    `Rang up sale ${sale.receiptNumber} — ${currency} ${sale.total.toLocaleString()}`
  );

  return sale;
}

export async function getProductByBarcode(bizProfileId: string, storeId: string, barcode: string) {
  const { userId } = await resolveOwner(bizProfileId);
  return businessService.getProductByBarcode(userId, barcode, storeId);
}