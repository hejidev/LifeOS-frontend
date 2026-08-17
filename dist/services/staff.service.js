"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStaff = listStaff;
exports.createStaff = createStaff;
exports.updateStaff = updateStaff;
exports.deleteStaff = deleteStaff;
exports.clockIn = clockIn;
exports.logActivity = logActivity;
exports.getStaffActivity = getStaffActivity;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const notification_service_1 = require("./notification.service");
async function getBizProfileId(userId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    return profile.id;
}
function serializeStaff(staff) {
    const { pinHash, ...rest } = staff;
    return rest;
}
async function listStaff(userId) {
    const bizProfileId = await getBizProfileId(userId);
    const staff = await prisma_1.prisma.bizStaff.findMany({ where: { bizProfileId }, orderBy: { createdAt: "asc" } });
    return staff.map(serializeStaff);
}
async function createStaff(userId, data) {
    const bizProfileId = await getBizProfileId(userId);
    const pinHash = await bcrypt_1.default.hash(data.pin, 10);
    const staff = await prisma_1.prisma.bizStaff.create({
        data: { bizProfileId, name: data.name, email: data.email, phone: data.phone, role: data.role, pinHash },
    });
    return serializeStaff(staff);
}
async function updateStaff(userId, staffId, data) {
    const bizProfileId = await getBizProfileId(userId);
    const existing = await prisma_1.prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
    if (!existing)
        throw new errors_1.AppError("Staff member not found", 404);
    const pinHash = data.pin ? await bcrypt_1.default.hash(data.pin, 10) : undefined;
    const staff = await prisma_1.prisma.bizStaff.update({
        where: { id: staffId },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.email !== undefined && { email: data.email }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.role && { role: data.role }),
            ...(data.status && { status: data.status }),
            ...(pinHash && { pinHash }),
        },
    });
    return serializeStaff(staff);
}
async function deleteStaff(userId, staffId) {
    const bizProfileId = await getBizProfileId(userId);
    const existing = await prisma_1.prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
    if (!existing)
        throw new errors_1.AppError("Staff member not found", 404);
    await prisma_1.prisma.bizStaff.delete({ where: { id: staffId } });
}
async function clockIn(userId, staffId, pin) {
    const bizProfileId = await getBizProfileId(userId);
    const staff = await prisma_1.prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
    if (!staff)
        throw new errors_1.AppError("Staff member not found", 404);
    if (staff.status === "SUSPENDED")
        throw new errors_1.AppError("This staff account is suspended", 403);
    const valid = await bcrypt_1.default.compare(pin, staff.pinHash);
    if (!valid)
        throw new errors_1.AppError("Incorrect PIN", 401);
    const now = new Date();
    await prisma_1.prisma.bizStaff.update({ where: { id: staffId }, data: { lastActiveAt: now } });
    await prisma_1.prisma.bizStaffActivity.create({
        data: { staffId, bizProfileId, action: "LOGIN", description: `${staff.name} clocked in` },
    });
    await (0, notification_service_1.createNotification)(userId, {
        type: "STAFF",
        title: "Staff clocked in",
        message: `${staff.name} clocked in at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        actionUrl: "/merchant/staff/activity",
    });
    return serializeStaff(staff);
}
async function logActivity(userId, staffId, data) {
    const bizProfileId = await getBizProfileId(userId);
    const staff = await prisma_1.prisma.bizStaff.findFirst({ where: { id: staffId, bizProfileId } });
    if (!staff)
        throw new errors_1.AppError("Staff member not found", 404);
    await prisma_1.prisma.bizStaff.update({ where: { id: staffId }, data: { lastActiveAt: new Date() } });
    return prisma_1.prisma.bizStaffActivity.create({
        data: { staffId, bizProfileId, action: data.action, description: data.description, metadata: data.metadata },
    });
}
async function getStaffActivity(userId, staffId) {
    const bizProfileId = await getBizProfileId(userId);
    return prisma_1.prisma.bizStaffActivity.findMany({
        where: { bizProfileId, ...(staffId && { staffId }) },
        include: { staff: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
}
