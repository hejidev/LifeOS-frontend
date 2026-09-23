"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listShifts = listShifts;
exports.createShift = createShift;
exports.updateShift = updateShift;
exports.deleteShift = deleteShift;
exports.listMyShifts = listMyShifts;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
async function getBizProfileId(userId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    return profile.id;
}
function serializeShift(s) {
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
async function listShifts(userId, params) {
    const bizProfileId = await getBizProfileId(userId);
    const where = { bizProfileId };
    if (params.staffId)
        where.staffId = params.staffId;
    if (params.from || params.to) {
        where.startsAt = {};
        if (params.from)
            where.startsAt.gte = new Date(params.from);
        if (params.to)
            where.startsAt.lte = new Date(params.to);
    }
    const shifts = await prisma_1.prisma.staffShift.findMany({
        where,
        include: { staff: { select: { name: true } }, store: { select: { name: true } } },
        orderBy: { startsAt: "asc" },
    });
    return shifts.map(serializeShift);
}
async function createShift(userId, data) {
    const bizProfileId = await getBizProfileId(userId);
    const staff = await prisma_1.prisma.bizStaff.findFirst({ where: { id: data.staffId, bizProfileId } });
    if (!staff)
        throw new errors_1.AppError("Staff member not found", 404);
    const shift = await prisma_1.prisma.staffShift.create({
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
async function updateShift(userId, shiftId, data) {
    const bizProfileId = await getBizProfileId(userId);
    const existing = await prisma_1.prisma.staffShift.findFirst({ where: { id: shiftId, bizProfileId } });
    if (!existing)
        throw new errors_1.AppError("Shift not found", 404);
    const nextStart = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
    const nextEnd = data.endsAt ? new Date(data.endsAt) : existing.endsAt;
    if (nextEnd.getTime() <= nextStart.getTime()) {
        throw new errors_1.AppError("Shift end time must be after the start time", 400);
    }
    const shift = await prisma_1.prisma.staffShift.update({
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
async function deleteShift(userId, shiftId) {
    const bizProfileId = await getBizProfileId(userId);
    const existing = await prisma_1.prisma.staffShift.findFirst({ where: { id: shiftId, bizProfileId } });
    if (!existing)
        throw new errors_1.AppError("Shift not found", 404);
    await prisma_1.prisma.staffShift.delete({ where: { id: shiftId } });
}
async function listMyShifts(staffId, bizProfileId) {
    const now = new Date();
    const shifts = await prisma_1.prisma.staffShift.findMany({
        where: { staffId, bizProfileId, endsAt: { gte: now } },
        include: { store: { select: { name: true } } },
        orderBy: { startsAt: "asc" },
        take: 20,
    });
    return shifts.map(serializeShift);
}
