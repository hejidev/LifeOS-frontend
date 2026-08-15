"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFamilyDashboard = getFamilyDashboard;
exports.createMember = createMember;
exports.updateMember = updateMember;
exports.deleteMember = deleteMember;
exports.createControl = createControl;
exports.updateControl = updateControl;
exports.deleteControl = deleteControl;
exports.createInvite = createInvite;
exports.revokeInvite = revokeInvite;
exports.getInviteByToken = getInviteByToken;
exports.acceptInvite = acceptInvite;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const env_1 = require("../config/env");
const email_service_1 = require("./email.service");
async function getFamilyDashboard(userId) {
    const [members, controls, invites] = await Promise.all([
        prisma_1.prisma.familyMember.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma_1.prisma.familyControl.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma_1.prisma.familyInvite.findMany({ where: { userId, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    ]);
    const childCount = members.filter((m) => m.role === "CHILD").length;
    const locationSharingCount = members.filter((m) => m.locationSharing).length;
    const enabledControls = controls.filter((c) => c.enabled).length;
    const insight = members.length === 0
        ? "Add family members to start managing screen time and safety controls."
        : `${members.length} member${members.length === 1 ? "" : "s"}, ${enabledControls} active control${enabledControls === 1 ? "" : "s"}.`;
    return {
        members, controls, pendingInvites: invites,
        stats: { totalMembers: members.length, childCount, locationSharingCount, enabledControls },
        insight,
    };
}
async function createMember(userId, data) {
    return prisma_1.prisma.familyMember.create({
        data: { userId, name: data.name, role: data.role, device: data.device, locationSharing: data.locationSharing ?? false },
    });
}
async function updateMember(userId, id, data) {
    const existing = await prisma_1.prisma.familyMember.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Family member not found", 404);
    return prisma_1.prisma.familyMember.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.role && { role: data.role }),
            ...(data.device !== undefined && { device: data.device }),
            ...(data.locationSharing !== undefined && { locationSharing: data.locationSharing }),
            ...(data.status && { status: data.status }),
            ...(data.screenTimeMinutesToday !== undefined && { screenTimeMinutesToday: data.screenTimeMinutesToday }),
            ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
        },
    });
}
async function deleteMember(userId, id) {
    const existing = await prisma_1.prisma.familyMember.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Family member not found", 404);
    await prisma_1.prisma.familyMember.delete({ where: { id } });
}
async function createControl(userId, data) {
    return prisma_1.prisma.familyControl.create({
        data: { userId, memberId: data.memberId, title: data.title, description: data.description, enabled: data.enabled ?? true, value: data.value },
    });
}
async function updateControl(userId, id, data) {
    const existing = await prisma_1.prisma.familyControl.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Control not found", 404);
    return prisma_1.prisma.familyControl.update({
        where: { id },
        data: {
            ...(data.title && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.enabled !== undefined && { enabled: data.enabled }),
            ...(data.value !== undefined && { value: data.value }),
        },
    });
}
async function deleteControl(userId, id) {
    const existing = await prisma_1.prisma.familyControl.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Control not found", 404);
    await prisma_1.prisma.familyControl.delete({ where: { id } });
}
async function createInvite(userId, ownerName, data) {
    const token = crypto_1.default.randomBytes(24).toString("hex");
    const invite = await prisma_1.prisma.familyInvite.create({
        data: { userId, email: data.email, role: data.role, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    const link = `${env_1.env.FRONTEND_URL}/family/join?token=${token}`;
    await (0, email_service_1.sendFamilyInviteEmail)(data.email, ownerName, link);
    return invite;
}
async function revokeInvite(userId, id) {
    const existing = await prisma_1.prisma.familyInvite.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Invite not found", 404);
    await prisma_1.prisma.familyInvite.update({ where: { id }, data: { status: "REVOKED" } });
}
async function getInviteByToken(token) {
    const invite = await prisma_1.prisma.familyInvite.findUnique({ where: { token } });
    if (!invite)
        throw new errors_1.AppError("Invite not found", 404);
    if (invite.status !== "PENDING")
        throw new errors_1.AppError("This invite is no longer valid", 400);
    if (invite.expiresAt < new Date()) {
        await prisma_1.prisma.familyInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
        throw new errors_1.AppError("This invite has expired", 400);
    }
    const inviter = await prisma_1.prisma.user.findUnique({ where: { id: invite.userId } });
    return {
        email: invite.email,
        role: invite.role,
        inviterName: inviter?.name ?? "A LifeOS user",
        expiresAt: invite.expiresAt.toISOString(),
    };
}
async function acceptInvite(token, memberName) {
    const invite = await prisma_1.prisma.familyInvite.findUnique({ where: { token } });
    if (!invite)
        throw new errors_1.AppError("Invite not found", 404);
    if (invite.status !== "PENDING")
        throw new errors_1.AppError("This invite is no longer valid", 400);
    if (invite.expiresAt < new Date()) {
        await prisma_1.prisma.familyInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
        throw new errors_1.AppError("This invite has expired", 400);
    }
    const member = await prisma_1.prisma.familyMember.create({
        data: { userId: invite.userId, name: memberName, role: invite.role },
    });
    await prisma_1.prisma.familyInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    return member;
}
