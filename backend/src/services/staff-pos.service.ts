import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import * as businessService from "./business.service";
import * as staffPortalService from "./staff-portal.service";

const MAX_OFFLINE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

async function resolveOwner(bizProfileId: string) {
  const profile = await prisma.bizProfile.findUnique({
    where: { id: bizProfileId },
    select: { userId: true, currency: true, paused: true },
  });
  if (!profile) throw new AppError("Store not found", 404);
  if (profile.paused) throw new AppError("This store is currently paused", 403);
  return profile;
}

function toStaffProduct(product: any) {
  const { cost: _cost, margin: _margin, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = product;
  return rest;
}

export async function getProducts(bizProfileId: string, storeId: string) {
  const { userId } = await resolveOwner(bizProfileId);
  const products = await businessService.listProducts(userId, true, storeId);
  return products.map(toStaffProduct);
}

export async function getCustomers(bizProfileId: string) {
  const { userId } = await resolveOwner(bizProfileId);
  return businessService.listCustomers(userId);
}

export async function createCustomer(bizProfileId: string, data: any) {
  const { userId } = await resolveOwner(bizProfileId);
  return businessService.createCustomer(userId, data);
}

export async function getProductByBarcode(bizProfileId: string, storeId: string, barcode: string) {
  const { userId } = await resolveOwner(bizProfileId);
  const product = await businessService.getProductByBarcode(userId, barcode, storeId);
  return toStaffProduct(product);
}

export async function createSale(staffId: string, bizProfileId: string, storeId: string, data: any) {
  const { userId, currency } = await resolveOwner(bizProfileId);
  const {
    discount: _discount,
    items,
    clientRequestId,
    receiptNumber,
    soldAt,
    offline,
    staffId: claimedStaffId,
    ...saleData
  } = data;
  const isOffline = offline === true;

  if (clientRequestId) {
    const existing = await businessService.findSaleByRequestId(userId, clientRequestId);
    if (existing) return existing;
  }

  const productIds: string[] = items.map((item: any) => item.productId).filter(Boolean);
  if (productIds.length !== items.length) {
    throw new AppError("Every item must be a product from the catalog", 400);
  }

  const products = await prisma.bizProduct.findMany({
    where: { id: { in: productIds }, userId },
    select: { id: true, name: true, price: true, active: true },
  });
  const catalog = new Map(products.map((product) => [product.id, product]));

  const reviewNotes: string[] = [];
  const pricedItems = items.map((item: any) => {
    const product = catalog.get(item.productId);
    if (!product || (!isOffline && !product.active)) {
      throw new AppError("One of the items is no longer available", 400);
    }
    const catalogPrice = Number(product.price);
    if (!isOffline) {
      return { productId: product.id, name: product.name, quantity: item.quantity, unitPrice: catalogPrice };
    }
    if (Math.abs(item.unitPrice - catalogPrice) > 0.009) {
      reviewNotes.push(`${product.name}: sold at ${currency} ${item.unitPrice}, catalog price is ${currency} ${catalogPrice}`);
    }
    return { productId: product.id, name: product.name, quantity: item.quantity, unitPrice: item.unitPrice };
  });

  let soldAtDate: Date | undefined;
  let actingStaffId = staffId;
  if (isOffline) {
    const parsed = soldAt ? new Date(soldAt) : new Date();
    const now = Date.now();
    if (Number.isNaN(parsed.getTime())) throw new AppError("Invalid sale time", 400);
    if (now - parsed.getTime() > MAX_OFFLINE_AGE_MS) {
      throw new AppError("This offline sale is too old to import automatically", 400);
    }
    soldAtDate = parsed.getTime() > now ? new Date(now) : parsed;

    if (claimedStaffId && claimedStaffId !== staffId) {
      const colleague = await prisma.bizStaff.findFirst({
        where: { id: claimedStaffId, bizProfileId, storeId },
        select: { id: true },
      });
      if (colleague) actingStaffId = colleague.id;
    }
  }

  let sale: Awaited<ReturnType<typeof businessService.createSale>>;
  try {
    sale = await businessService.createSale(
      userId,
      {
        ...saleData,
        items: pricedItems,
        discount: 0,
        status: "PAID",
        clientRequestId,
        receiptNumber,
        soldAt: soldAtDate,
        offline: isOffline,
        reviewNotes,
      },
      storeId
    );
  } catch (err: any) {
    if (err?.code === "P2002" && clientRequestId) {
      const existing = await businessService.findSaleByRequestId(userId, clientRequestId);
      if (existing) return existing;
    }
    throw err;
  }

  const description = `Rang up sale ${sale.receiptNumber} — ${currency} ${sale.total.toLocaleString()}`;
  if (isOffline) {
    await prisma.bizStaffActivity.create({
      data: {
        staffId: actingStaffId,
        bizProfileId,
        action: "SALE_CREATED",
        description: `${description} (sold offline)`,
        createdAt: soldAtDate,
      },
    });
  } else {
    await staffPortalService.logSelfActivity(staffId, bizProfileId, "SALE_CREATED", description);
  }

  return sale;
}