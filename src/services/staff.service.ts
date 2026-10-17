import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { createNotification } from "./notification.service";
import { sendStaffAddedEmail } from "./email.service";

const num = (d: any) => (d == null ? 0 : Number(d));

function rangeStart(range: "today" | "week" | "month") {
  const now = new Date();
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "week") {
    const d = new Date(now);
    const day = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getBizProfileId(userId: string) {
  const profile = await prisma.bizProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("Merchant profile not found", 404);
  return profile.id;
}

function serializeStaff(staff: any) {
  const { pinHash, ...rest } = staff;
  return rest;
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

export async function createStaff(userId: string, data: { name: string; email?: string; phone?: string; address?: string; age?: number; sex?: string; tribe?: string; religion?: string; role: string; pin: string; storeId?: string }) {
  const bizProfileId = await getBizProfileId(userId);
  const pinHash = await bcrypt.hash(data.pin, 10);

  let storeId = data.storeId;
  if (!storeId) {
    const defaultStore = await prisma.store.findFirst({ where: { bizProfileId, isDefault: true } });
    storeId = defaultStore?.id;
  }

  const staff = await prisma.bizStaff.create({
    data: { bizProfileId, storeId, name: data.name, email: data.email, phone: data.phone, address: data.address, age: data.age, sex: data.sex, tribe: data.tribe, religion: data.religion, role: data.role as any, pinHash },
  });

  const profile = await prisma.bizProfile.findUnique({ where: { id: bizProfileId }, include: { user: { select: { email: true, name: true } } } });
  if (profile) {
    await sendStaffAddedEmail(profile.user.email, profile.user.name ?? "there", staff.name, profile.businessName);
  }

  return serializeStaff(staff);
}

export async function updateStaff(userId: string, staffId: string, data: any) {
  const bizProfileId = await getBizProfileId(userId);
  const existing = await prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
  if (!existing) throw new AppError("Staff member not found", 404);

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

export async function getStaffPerformance(userId: string, range: "today" | "week" | "month" = "month") {
  const bizProfileId = await getBizProfileId(userId);
  const start = rangeStart(range);

  const [staffList, activities] = await Promise.all([
    prisma.bizStaff.findMany({ where: { bizProfileId } }),
    prisma.bizStaffActivity.findMany({ where: { bizProfileId, action: "SALE_CREATED", createdAt: { gte: start } } }),
  ]);

  const receiptToStaff = new Map<string, string>();
  for (const a of activities) {
    const match = a.description.match(/Rang up sale (\S+)/);
    if (match) receiptToStaff.set(match[1], a.staffId);
  }

  const receiptNumbers = [...receiptToStaff.keys()];
  const sales = receiptNumbers.length
    ? await prisma.bizSale.findMany({
        where: { userId, receiptNumber: { in: receiptNumbers }, status: "PAID" },
        select: { receiptNumber: true, total: true },
      })
    : [];

  const otherActivity = await prisma.bizStaffActivity.groupBy({
    by: ["staffId", "action"],
    where: { bizProfileId, createdAt: { gte: start }, action: { in: ["CUSTOMER_ADDED", "REFUND_ISSUED"] } },
    _count: { _all: true },
  });

  const perStaff = new Map<string, { salesCount: number; revenue: number }>();
  for (const sale of sales) {
    const staffId = receiptToStaff.get(sale.receiptNumber);
    if (!staffId) continue;
    const cur = perStaff.get(staffId) ?? { salesCount: 0, revenue: 0 };
    cur.salesCount += 1;
    cur.revenue += num(sale.total);
    perStaff.set(staffId, cur);
  }

  const extras = new Map<string, { customersAdded: number; refundsIssued: number }>();
  for (const row of otherActivity) {
    const cur = extras.get(row.staffId) ?? { customersAdded: 0, refundsIssued: 0 };
    if (row.action === "CUSTOMER_ADDED") cur.customersAdded = row._count._all;
    if (row.action === "REFUND_ISSUED") cur.refundsIssued = row._count._all;
    extras.set(row.staffId, cur);
  }

  return staffList
    .map((s) => {
      const perf = perStaff.get(s.id) ?? { salesCount: 0, revenue: 0 };
      const ex = extras.get(s.id) ?? { customersAdded: 0, refundsIssued: 0 };
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        status: s.status,
        lastActiveAt: s.lastActiveAt?.toISOString(),
        salesCount: perf.salesCount,
        revenue: perf.revenue,
        avgSaleValue: perf.salesCount > 0 ? Math.round(perf.revenue / perf.salesCount) : 0,
        customersAdded: ex.customersAdded,
        refundsIssued: ex.refundsIssued,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}