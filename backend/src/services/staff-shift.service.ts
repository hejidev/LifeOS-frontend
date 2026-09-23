import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

async function getBizProfileId(userId: string) {
  const profile = await prisma.bizProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("Merchant profile not found", 404);
  return profile.id;
}

function serializeShift(s: any) {
  return {
    id: s.id,
    staffId: s.staffId,
    staffName: s.staff?.name,
    storeId: s.storeId ?? undefined,
    storeName: s.store?.name,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    note: s.note ?? undefined,
    createdAt: s.createdAt.toISOString(),
  };
}

export async function listShifts(userId: string, params: { from?: string; to?: string; staffId?: string }) {
  const bizProfileId = await getBizProfileId(userId);
  const where: any = { bizProfileId };
  if (params.staffId) where.staffId = params.staffId;
  if (params.from || params.to) {
    where.startsAt = {};
    if (params.from) where.startsAt.gte = new Date(params.from);
    if (params.to) where.startsAt.lte = new Date(params.to);
  }
  const shifts = await prisma.staffShift.findMany({
    where,
    include: { staff: { select: { name: true } }, store: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });
  return shifts.map(serializeShift);
}

export async function createShift(userId: string, data: { staffId: string; startsAt: string; endsAt: string; storeId?: string; note?: string }) {
  const bizProfileId = await getBizProfileId(userId);
  const staff = await prisma.bizStaff.findFirst({ where: { id: data.staffId, bizProfileId } });
  if (!staff) throw new AppError("Staff member not found", 404);

  const shift = await prisma.staffShift.create({
    data: {
      bizProfileId,
      staffId: data.staffId,
      storeId: data.storeId,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      note: data.note,
    },
    include: { staff: { select: { name: true } }, store: { select: { name: true } } },
  });
  return serializeShift(shift);
}

export async function updateShift(userId: string, shiftId: string, data: { startsAt?: string; endsAt?: string; storeId?: string; note?: string }) {
  const bizProfileId = await getBizProfileId(userId);
  const existing = await prisma.staffShift.findFirst({ where: { id: shiftId, bizProfileId } });
  if (!existing) throw new AppError("Shift not found", 404);

  const nextStart = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
  const nextEnd = data.endsAt ? new Date(data.endsAt) : existing.endsAt;
  if (nextEnd.getTime() <= nextStart.getTime()) {
    throw new AppError("Shift end time must be after the start time", 400);
  }

  const shift = await prisma.staffShift.update({
    where: { id: shiftId },
    data: {
      ...(data.startsAt && { startsAt: nextStart }),
      ...(data.endsAt && { endsAt: nextEnd }),
      ...(data.storeId !== undefined && { storeId: data.storeId }),
      ...(data.note !== undefined && { note: data.note }),
    },
    include: { staff: { select: { name: true } }, store: { select: { name: true } } },
  });
  return serializeShift(shift);
}

export async function deleteShift(userId: string, shiftId: string) {
  const bizProfileId = await getBizProfileId(userId);
  const existing = await prisma.staffShift.findFirst({ where: { id: shiftId, bizProfileId } });
  if (!existing) throw new AppError("Shift not found", 404);
  await prisma.staffShift.delete({ where: { id: shiftId } });
}

export async function listMyShifts(staffId: string, bizProfileId: string) {
  const now = new Date();
  const shifts = await prisma.staffShift.findMany({
    where: { staffId, bizProfileId, endsAt: { gte: now } },
    include: { store: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
    take: 20,
  });
  return shifts.map(serializeShift);
}