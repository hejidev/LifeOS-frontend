import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { createNotification } from "./notification.service";

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
  const staff = await prisma.bizStaff.findMany({ where: { bizProfileId }, orderBy: { createdAt: "asc" } });
  return staff.map(serializeStaff);
}

export async function createStaff(userId: string, data: { name: string; email?: string; phone?: string; address?: string; age?: number; sex?: string; tribe?: string; religion?: string; role: string; pin: string }) {
  const bizProfileId = await getBizProfileId(userId);
  const pinHash = await bcrypt.hash(data.pin, 10);
  const staff = await prisma.bizStaff.create({
    data: { bizProfileId, name: data.name, email: data.email, phone: data.phone, address: data.address, age: data.age, sex: data.sex, tribe: data.tribe, religion: data.religion, role: data.role as any, pinHash },
  });
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