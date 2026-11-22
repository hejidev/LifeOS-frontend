import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { MERCHANT_PLANS } from "../config/plan";
import { AppError } from "../lib/errors";
import { dayBounds, dayNumber, shiftDateKey, startOfLocalDay } from "../lib/time";
import { getUserClock } from "../lib/user-clock";
import { createNotification } from "./notification.service";
import { sendStaffAddedEmail } from "./email.service";

type Range = "today" | "week" | "month";

const num = (d: any) => (d == null ? 0 : Number(d));

async function rangeStart(userId: string, range: Range) {
  const clock = await getUserClock(userId);
  const { zone, dateKey } = dayBounds(clock.zone);

  if (range === "today") return startOfLocalDay(dateKey, zone);
  if (range === "week") {
    const weekday = (dayNumber(dateKey) + 4) % 7;
    const back = (weekday - clock.weekStartsOn + 7) % 7;
    return startOfLocalDay(shiftDateKey(dateKey, -back), zone);
  }
  return startOfLocalDay(`${dateKey.slice(0, 8)}01`, zone);
}

async function getBizProfile(userId: string) {
  const profile = await prisma.bizProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("Merchant profile not found", 404);
  return profile;
}

const getBizProfileId = async (userId: string) => (await getBizProfile(userId)).id;

function serializeStaff(staff: any) {
  const { pinHash, ...rest } = staff;
  return rest;
}

function seatLimit(tier: string) {
  return tier in MERCHANT_PLANS ? MERCHANT_PLANS[tier as keyof typeof MERCHANT_PLANS].staffLimit : 1;
}

async function assertSeatAvailable(profile: { id: string; planTier: string }) {
  const limit = seatLimit(profile.planTier);
  const active = await prisma.bizStaff.count({ where: { bizProfileId: profile.id, status: "ACTIVE" } });
  if (active >= limit) {
    throw new AppError(`Your plan includes ${limit} staff ${limit === 1 ? "seat" : "seats"} and ${limit === 1 ? "it is" : "all are"} in use. Upgrade your plan to add more.`, 403);
  }
}

async function assertStore(bizProfileId: string, storeId: string) {
  const store = await prisma.store.findFirst({ where: { id: storeId, bizProfileId, active: true }, select: { id: true } });
  if (!store) throw new AppError("Location not found or inactive", 404);
}

export async function listStaff(userId: string) {
  const bizProfileId = await getBizProfileId(userId);
  const staff = await prisma.bizStaff.findMany({
    where: { bizProfileId },
    include: { store: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return staff.map(serializeStaff);
}

export async function createStaff(
  userId: string,
  data: { name: string; email?: string; phone?: string; address?: string; age?: number; sex?: string; tribe?: string; religion?: string; role: string; pin: string; storeId?: string }
) {
  const profile = await getBizProfile(userId);
  await assertSeatAvailable(profile);

  let storeId = data.storeId;
  if (storeId) {
    await assertStore(profile.id, storeId);
  } else {
    const defaultStore = await prisma.store.findFirst({ where: { bizProfileId: profile.id, isDefault: true } });
    storeId = defaultStore?.id;
  }

  const pinHash = await bcrypt.hash(data.pin, 10);
  const staff = await prisma.bizStaff.create({
    data: {
      bizProfileId: profile.id,
      storeId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      age: data.age,
      sex: data.sex,
      tribe: data.tribe,
      religion: data.religion,
      role: data.role as any,
      pinHash,
    },
  });

  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (owner) await sendStaffAddedEmail(owner.email, owner.name ?? "there", staff.name, profile.businessName);

  return serializeStaff(staff);
}

export async function updateStaff(userId: string, staffId: string, data: any) {
  const profile = await getBizProfile(userId);
  const existing = await prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId: profile.id } });
  if (!existing) throw new AppError("Staff member not found", 404);

  if (data.status === "ACTIVE" && existing.status !== "ACTIVE") await assertSeatAvailable(profile);
  if (data.storeId) await assertStore(profile.id, data.storeId);

  const pinHash = data.pin ? await bcrypt.hash(data.pin, 10) : undefined;

  const staff = await prisma.bizStaff.update({
    where: { id: staffId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.age !== undefined && { age: data.age }),
      ...(data.sex !== undefined && { sex: data.sex }),
      ...(data.tribe !== undefined && { tribe: data.tribe }),
      ...(data.religion !== undefined && { religion: data.religion }),
      ...(data.role && { role: data.role }),
      ...(data.status && { status: data.status }),
      ...(data.storeId !== undefined && { storeId: data.storeId }),
      ...(pinHash && { pinHash }),
    },
  });
  return serializeStaff(staff);
}

export async function deleteStaff(userId: string, staffId: string) {
  const bizProfileId = await getBizProfileId(userId);
  const existing = await prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
  if (!existing) throw new AppError("Staff member not found", 404);

  const [sales, activity] = await Promise.all([
    prisma.bizSale.count({ where: { userId, staffId } }),
    prisma.bizStaffActivity.count({ where: { staffId, action: { in: ["SALE_CREATED", "REFUND_ISSUED"] } } }),
  ]);
  if (sales > 0 || activity > 0) {
    throw new AppError(`${existing.name} has sales history. Suspend them instead so your records stay intact.`, 409);
  }

  await prisma.bizStaff.delete({ where: { id: staffId } });
}

export async function clockIn(userId: string, staffId: string, pin: string) {
  const bizProfileId = await getBizProfileId(userId);
  const staff = await prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
  if (!staff) throw new AppError("Staff member not found", 404);
  if (staff.status === "SUSPENDED") throw new AppError("This staff account is suspended", 403);

  const valid = await bcrypt.compare(pin, staff.pinHash);
  if (!valid) throw new AppError("Incorrect PIN", 401);

  const now = new Date();
  await prisma.bizStaff.update({ where: { id: staffId }, data: { lastActiveAt: now } });
  await prisma.bizStaffActivity.create({
    data: { staffId, bizProfileId, action: "LOGIN", description: `${staff.name} clocked in` },
  });

  await createNotification(userId, {
    type: "STAFF",
    title: "Staff clocked in",
    message: `${staff.name} clocked in at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    actionUrl: "/merchant/staff/activity",
  });

  return serializeStaff(staff);
}

export async function logActivity(userId: string, staffId: string, data: { action: string; description: string; metadata?: any }) {
  const bizProfileId = await getBizProfileId(userId);
  const staff = await prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
  if (!staff) throw new AppError("Staff member not found", 404);

  await prisma.bizStaff.update({ where: { id: staffId }, data: { lastActiveAt: new Date() } });

  return prisma.bizStaffActivity.create({
    data: { staffId, bizProfileId, action: data.action as any, description: data.description, metadata: data.metadata },
  });
}

export async function getStaffActivity(userId: string, staffId?: string) {
  const bizProfileId = await getBizProfileId(userId);
  return prisma.bizStaffActivity.findMany({
    where: { bizProfileId, ...(staffId && { staffId }) },
    include: { staff: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getStaffPerformance(userId: string, range: Range = "month") {
  const bizProfileId = await getBizProfileId(userId);
  const start = await rangeStart(userId, range);

  const [staffList, tagged, legacyActivity, otherActivity] = await Promise.all([
    prisma.bizStaff.findMany({ where: { bizProfileId } }),
    prisma.bizSale.groupBy({
      by: ["staffId"],
      where: { userId, status: "PAID", staffId: { not: null }, createdAt: { gte: start } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.bizStaffActivity.findMany({
      where: { bizProfileId, action: "SALE_CREATED", createdAt: { gte: start } },
      select: { staffId: true, description: true },
    }),
    prisma.bizStaffActivity.groupBy({
      by: ["staffId", "action"],
      where: { bizProfileId, createdAt: { gte: start }, action: { in: ["CUSTOMER_ADDED", "REFUND_ISSUED"] } },
      _count: { _all: true },
    }),
  ]);

  const perStaff = new Map<string, { salesCount: number; revenue: number }>();
  const credit = (id: string, count: number, revenue: number) => {
    const current = perStaff.get(id) ?? { salesCount: 0, revenue: 0 };
    current.salesCount += count;
    current.revenue += revenue;
    perStaff.set(id, current);
  };

  for (const row of tagged) if (row.staffId) credit(row.staffId, row._count._all, num(row._sum.total));

  const receiptToStaff = new Map<string, string>();
  for (const entry of legacyActivity) {
    const match = entry.description.match(/Rang up sale (\S+)/);
    if (match) receiptToStaff.set(match[1], entry.staffId);
  }
  if (receiptToStaff.size > 0) {
    const legacySales = await prisma.bizSale.findMany({
      where: { userId, staffId: null, status: "PAID", receiptNumber: { in: [...receiptToStaff.keys()] } },
      select: { receiptNumber: true, total: true },
    });
    for (const sale of legacySales) {
      const owner = receiptToStaff.get(sale.receiptNumber);
      if (owner) credit(owner, 1, num(sale.total));
    }
  }

  const extras = new Map<string, { customersAdded: number; refundsIssued: number }>();
  for (const row of otherActivity) {
    const current = extras.get(row.staffId) ?? { customersAdded: 0, refundsIssued: 0 };
    if (row.action === "CUSTOMER_ADDED") current.customersAdded = row._count._all;
    if (row.action === "REFUND_ISSUED") current.refundsIssued = row._count._all;
    extras.set(row.staffId, current);
  }

  return staffList
    .map((s) => {
      const perf = perStaff.get(s.id) ?? { salesCount: 0, revenue: 0 };
      const extra = extras.get(s.id) ?? { customersAdded: 0, refundsIssued: 0 };
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        status: s.status,
        lastActiveAt: s.lastActiveAt?.toISOString(),
        salesCount: perf.salesCount,
        revenue: perf.revenue,
        avgSaleValue: perf.salesCount > 0 ? Math.round(perf.revenue / perf.salesCount) : 0,
        customersAdded: extra.customersAdded,
        refundsIssued: extra.refundsIssued,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}