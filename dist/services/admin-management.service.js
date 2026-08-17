"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeUserRole = changeUserRole;
exports.createAdmin = createAdmin;
exports.grantPermission = grantPermission;
exports.revokePermission = revokePermission;
exports.getAdmins = getAdmins;
exports.sendBroadcast = sendBroadcast;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const audit_service_1 = require("./audit.service");
const io_instance_1 = require("../sockets/io-instance");
async function changeUserRole(actingAdminId, targetUserId, newRole) {
    if (actingAdminId === targetUserId) {
        throw new errors_1.AppError("You cannot change your own role", 400);
    }
    const target = await prisma_1.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target)
        throw new errors_1.AppError("User not found", 404);
    if (target.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN") {
        const superAdminCount = await prisma_1.prisma.user.count({ where: { role: "SUPER_ADMIN" } });
        if (superAdminCount <= 1)
            throw new errors_1.AppError("Cannot remove the last super admin", 400);
    }
    const updated = await prisma_1.prisma.user.update({ where: { id: targetUserId }, data: { role: newRole } });
    if (newRole !== "ADMIN") {
        await prisma_1.prisma.adminPermission.deleteMany({ where: { userId: targetUserId } });
    }
    await (0, audit_service_1.logAdminAction)(actingAdminId, "ROLE_CHANGED", "User", targetUserId, `Changed ${updated.email} from ${target.role} to ${newRole}`);
    return updated;
}
async function createAdmin(actingAdminId, data) {
    const existing = await prisma_1.prisma.user.findUnique({ where: { email: data.email } });
    if (existing)
        throw new errors_1.AppError("Email already in use", 409);
    const passwordHash = await bcrypt_1.default.hash(data.password, 12);
    const user = await prisma_1.prisma.user.create({
        data: { email: data.email, name: data.name, passwordHash, role: "ADMIN", provider: "CREDENTIALS", emailVerified: true },
    });
    await (0, audit_service_1.logAdminAction)(actingAdminId, "ADMIN_CREATED", "User", user.id, `Created admin account for ${user.email}`);
    return user;
}
async function grantPermission(actingAdminId, userId, capability) {
    const target = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!target)
        throw new errors_1.AppError("User not found", 404);
    if (target.role !== "ADMIN")
        throw new errors_1.AppError("Permissions can only be granted to admins", 400);
    await prisma_1.prisma.adminPermission.upsert({
        where: { userId_capability: { userId, capability: capability } },
        update: {},
        create: { userId, capability: capability, grantedBy: actingAdminId },
    });
    await (0, audit_service_1.logAdminAction)(actingAdminId, "PERMISSION_GRANTED", "User", userId, `Granted ${capability} to ${target.email}`);
}
async function revokePermission(actingAdminId, userId, capability) {
    const target = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!target)
        throw new errors_1.AppError("User not found", 404);
    await prisma_1.prisma.adminPermission.deleteMany({ where: { userId, capability: capability } });
    await (0, audit_service_1.logAdminAction)(actingAdminId, "PERMISSION_REVOKED", "User", userId, `Revoked ${capability} from ${target.email}`);
}
async function getAdmins() {
    const admins = await prisma_1.prisma.user.findMany({
        where: { role: "ADMIN" },
        include: { permissions: true },
        orderBy: { createdAt: "desc" },
    });
    return admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        createdAt: a.createdAt.toISOString(),
        permissions: a.permissions.map((p) => p.capability),
    }));
}
async function sendBroadcast(actingAdminId, data) {
    let userIds;
    if (data.audience === "MERCHANTS") {
        const profiles = await prisma_1.prisma.bizProfile.findMany({ where: { status: "APPROVED" }, select: { userId: true } });
        userIds = profiles.map((p) => p.userId);
    }
    else if (data.audience === "USERS") {
        const users = await prisma_1.prisma.user.findMany({ where: { isActive: true, role: "USER" }, select: { id: true } });
        userIds = users.map((u) => u.id);
    }
    else {
        const users = await prisma_1.prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
        userIds = users.map((u) => u.id);
    }
    if (userIds.length === 0)
        return { sentTo: 0 };
    await prisma_1.prisma.notification.createMany({
        data: userIds.map((userId) => ({ userId, type: "SYSTEM", title: data.title, message: data.message })),
    });
    const io = (0, io_instance_1.getIO)();
    if (io) {
        for (const userId of userIds) {
            io.to(`user:${userId}`).emit("notification:new", {
                type: "SYSTEM", title: data.title, message: data.message, read: false, createdAt: new Date().toISOString(),
            });
        }
    }
    await (0, audit_service_1.logAdminAction)(actingAdminId, "BROADCAST_SENT", "Broadcast", "n/a", `Sent "${data.title}" to ${userIds.length} recipients (${data.audience})`);
    return { sentTo: userIds.length };
}
