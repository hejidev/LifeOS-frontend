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

export async function getProducts(bizProfileId: string) {
  const { userId } = await resolveOwner(bizProfileId);
  return businessService.listProducts(userId, true);
}

export async function getCustomers(bizProfileId: string) {
  const { userId } = await resolveOwner(bizProfileId);
  return businessService.listCustomers(userId);
}

export async function createCustomer(bizProfileId: string, data: any) {
  const { userId } = await resolveOwner(bizProfileId);
  return businessService.createCustomer(userId, data);
}

export async function createSale(staffId: string, bizProfileId: string, data: any) {
  const { userId, currency } = await resolveOwner(bizProfileId);

  const { discount: _ignored, ...saleData } = data;
  const sale = await businessService.createSale(userId, { ...saleData, discount: 0 });

  await staffPortalService.logSelfActivity(
    staffId,
    bizProfileId,
    "SALE_CREATED",
    `Rang up sale ${sale.receiptNumber} — ${currency} ${sale.total.toLocaleString()}`
  );

  return sale;
}