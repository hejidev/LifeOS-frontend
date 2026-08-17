"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.toggleUserStatus = toggleUserStatus;
exports.listTenants = listTenants;
exports.getBillingStats = getBillingStats;
exports.getAnalytics = getAnalytics;
exports.getOverview = getOverview;
exports.getAuditLog = getAuditLog;
exports.getMyPermissions = getMyPermissions;
exports.sendSupportPasswordReset = sendSupportPasswordReset;
exports.requestSupportEmailChange = requestSupportEmailChange;
exports.confirmSupportEmailChange = confirmSupportEmailChange;
exports.resetSupportTwoFactor = resetSupportTwoFactor;
exports.deleteUser = deleteUser;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const audit_service_1 = require("./audit.service");
const token_service_1 = require("./token.service");
const auth_service_1 = require("./auth.service");
const email_service_1 = require("./email.service");
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const crypto_1 = __importDefault(require("crypto"));
function serializeUser(u) {
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.isActive ? "active" : "suspended",
        plan: u.subscription?.tier === "FREE" || !u.subscription ? "free" : u.subscription.tier.toLowerCase(),
        lastActive: u.updatedAt.toISOString(),
        createdAt: u.createdAt.toISOString(),
        twoFactorEnabled: u.twoFactorEnabled,
        provider: u.provider,
        emailVerified: u.emailVerified,
    };
}
async function listUsers(search) {
    const users = await prisma_1.prisma.user.findMany({
        where: search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            }
            : undefined,
        include: { subscription: true },
        orderBy: { createdAt: "desc" },
        take: 200,
    });
    return users.map(serializeUser);
}
async function toggleUserStatus(adminId, userId) {
    if (adminId === userId)
        throw new errors_1.AppError("You cannot suspend your own account", 400);
    const user = await getSupportTarget(userId);
    if (user.role !== "USER")
        throw new errors_1.AppError("Manage administrator accounts from the Admins area", 403);
    const updated = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { isActive: !user.isActive },
        include: { subscription: true },
    });
    await (0, audit_service_1.logAdminAction)(adminId, updated.isActive ? "USER_ACTIVATED" : "USER_SUSPENDED", "User", userId, `${updated.isActive ? "Activated" : "Suspended"} ${updated.email}`);
    return serializeUser(updated);
}
async function listTenants() {
    const profiles = await prisma_1.prisma.bizProfile.findMany({
        where: { status: { in: ["APPROVED", "SUSPENDED"] } },
        include: { staff: { select: { id: true } } },
        orderBy: { appliedAt: "desc" },
    });
    return profiles.map((p) => ({
        id: p.id,
        name: p.businessName,
        plan: p.planTier === "NONE" ? "free" : p.planTier.toLowerCase(),
        users: p.staff.length + 1,
        status: p.status === "SUSPENDED" ? "suspended" : p.planStatus === "ACTIVE" ? "active" : "trial",
        mrr: 0, // populated below in getBillingStats using real Stripe amounts
    }));
}
const TIER_PRICE_USD = {
    STARTER: 7, PRO: 15, PREMIUM: 29,
};
const MERCHANT_TIER_PRICE_USD = {
    STARTER: 9, GROWTH: 24, PRO: 49,
};
async function getBillingStats() {
    const [toolSubs, merchantProfiles, totalUsers] = await Promise.all([
        prisma_1.prisma.subscription.findMany({ where: { status: "ACTIVE", tier: { not: "FREE" } } }),
        prisma_1.prisma.bizProfile.findMany({ where: { planStatus: "ACTIVE" } }),
        prisma_1.prisma.user.count(),
    ]);
    const toolMRR = toolSubs.reduce((sum, s) => sum + (TIER_PRICE_USD[s.tier] ?? 0), 0);
    const merchantMRR = merchantProfiles.reduce((sum, p) => sum + (MERCHANT_TIER_PRICE_USD[p.planTier] ?? 0), 0);
    const premiumUsers = toolSubs.length;
    return {
        totalMRR: toolMRR + merchantMRR,
        totalUsers,
        premiumUsers,
        toolMRR,
        merchantMRR,
        activeMerchants: merchantProfiles.length,
    };
}
async function getAnalytics() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const users = await prisma_1.prisma.user.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
    });
    const signupsByMonth = new Map();
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = d.toLocaleString("en-US", { month: "short" });
        signupsByMonth.set(key, 0);
    }
    for (const u of users) {
        const key = u.createdAt.toLocaleString("en-US", { month: "short" });
        if (signupsByMonth.has(key))
            signupsByMonth.set(key, (signupsByMonth.get(key) ?? 0) + 1);
    }
    const signups = Array.from(signupsByMonth.entries()).map(([month, count]) => ({ month, count }));
    const [taskCount, noteCount, financeCount, aiWritingCount, healthCount] = await Promise.all([
        prisma_1.prisma.task.count(),
        prisma_1.prisma.note.count(),
        prisma_1.prisma.transaction.count(),
        prisma_1.prisma.writingDocument.count(),
        prisma_1.prisma.healthLog.count(),
    ]);
    const totalUsers = await prisma_1.prisma.user.count();
    const usageRate = (count) => (totalUsers > 0 ? Math.min(100, Math.round((count / totalUsers) * 100)) : 0);
    const moduleUsage = [
        { module: "Tasks", usage: usageRate(taskCount) },
        { module: "Notes", usage: usageRate(noteCount) },
        { module: "Finance", usage: usageRate(financeCount) },
        { module: "AI Writing", usage: usageRate(aiWritingCount) },
        { module: "Health", usage: usageRate(healthCount) },
    ];
    return { signups, moduleUsage };
}
async function getOverview() {
    const [totalUsers, activeMerchants, pendingApplications, billing, todaySignups] = await Promise.all([
        prisma_1.prisma.user.count(),
        prisma_1.prisma.bizProfile.count({ where: { status: "APPROVED", planStatus: "ACTIVE" } }),
        prisma_1.prisma.bizProfile.count({ where: { status: "PENDING" } }),
        getBillingStats(),
        prisma_1.prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);
    return { totalUsers, activeMerchants, pendingApplications, totalMRR: billing.totalMRR, todaySignups };
}
async function getAuditLog(limit = 50) {
    const logs = await prisma_1.prisma.adminAuditLog.findMany({
        include: { admin: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
    });
    return logs.map((l) => ({
        id: l.id,
        action: l.action,
        description: l.description,
        adminName: l.admin.name,
        adminEmail: l.admin.email,
        createdAt: l.createdAt.toISOString(),
    }));
}
async function getMyPermissions(userId, role) {
    if (role === "SUPER_ADMIN") {
        return { role, capabilities: ["MANAGE_USERS", "MANAGE_MERCHANTS", "MANAGE_CONTENT", "SEND_BROADCASTS", "VIEW_ANALYTICS", "MESSAGE_USERS"] };
    }
    const perms = await prisma_1.prisma.adminPermission.findMany({ where: { userId } });
    return { role, capabilities: perms.map((p) => p.capability) };
}
async function getSupportTarget(userId) {
    const target = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!target)
        throw new errors_1.AppError("User not found", 404);
    if (target.role === "SUPER_ADMIN") {
        throw new errors_1.AppError("Super-admin accounts must be handled by another super admin through a dedicated recovery process", 403);
    }
    return target;
}
async function sendSupportPasswordReset(adminId, userId, reason) {
    const target = await getSupportTarget(userId);
    if (!target.passwordHash)
        throw new errors_1.AppError("This OAuth account has no password to reset", 400);
    await (0, auth_service_1.forgotPassword)(target.email);
    await (0, audit_service_1.logAdminAction)(adminId, "USER_PASSWORD_RESET_SENT", "User", target.id, `Sent password-reset link to ${target.email}. Reason: ${reason}`);
}
async function requestSupportEmailChange(adminId, userId, email, reason) {
    const target = await getSupportTarget(userId);
    const newEmail = email.trim().toLowerCase();
    if (newEmail === target.email.toLowerCase())
        throw new errors_1.AppError("The new email matches the current email", 400);
    const existing = await prisma_1.prisma.user.findUnique({ where: { email: newEmail } });
    if (existing)
        throw new errors_1.AppError("That email address is already in use", 409);
    const token = crypto_1.default.randomBytes(32).toString("hex");
    await redis_1.redis.set(`support-email-change:${crypto_1.default.createHash("sha256").update(token).digest("hex")}`, JSON.stringify({ adminId, userId: target.id, newEmail, reason }), "EX", 30 * 60);
    const confirmLink = `${env_1.env.FRONTEND_URL}/confirm-email-change?token=${token}`;
    await (0, email_service_1.sendSupportEmailChangeVerification)(newEmail, confirmLink);
    await (0, audit_service_1.logAdminAction)(adminId, "USER_EMAIL_CHANGE_REQUESTED", "User", target.id, `Sent email-change verification to ${newEmail}. Reason: ${reason}`);
}
async function confirmSupportEmailChange(token) {
    const key = `support-email-change:${crypto_1.default.createHash("sha256").update(token).digest("hex")}`;
    const raw = await redis_1.redis.get(key);
    if (!raw)
        throw new errors_1.AppError("This email-change link is invalid or has expired", 400);
    const request = JSON.parse(raw);
    const existing = await prisma_1.prisma.user.findUnique({ where: { email: request.newEmail } });
    if (existing && existing.id !== request.userId)
        throw new errors_1.AppError("That email address is already in use", 409);
    const updated = await prisma_1.prisma.user.update({
        where: { id: request.userId },
        data: { email: request.newEmail, emailVerified: true, sessionVersion: { increment: 1 } },
    });
    await Promise.all([redis_1.redis.del(key), (0, token_service_1.revokeAllUserSessions)(updated.id)]);
    await (0, audit_service_1.logAdminAction)(request.adminId, "USER_EMAIL_CHANGED", "User", updated.id, `Changed account email to ${updated.email}. Reason: ${request.reason}`);
}
async function resetSupportTwoFactor(adminId, userId, reason) {
    const target = await getSupportTarget(userId);
    if (!target.twoFactorEnabled)
        throw new errors_1.AppError("Two-factor authentication is not enabled for this account", 400);
    await prisma_1.prisma.user.update({
        where: { id: target.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null, sessionVersion: { increment: 1 } },
    });
    await (0, token_service_1.revokeAllUserSessions)(target.id);
    await (0, audit_service_1.logAdminAction)(adminId, "USER_TWO_FACTOR_RESET", "User", target.id, `Reset two-factor authentication for ${target.email}. Reason: ${reason}`);
}
async function deleteUser(adminId, userId, confirmationEmail, reason) {
    const target = await getSupportTarget(userId);
    if (target.role !== "USER")
        throw new errors_1.AppError("Only standard user accounts can be permanently deleted here", 403);
    if (target.email.toLowerCase() !== confirmationEmail.trim().toLowerCase()) {
        throw new errors_1.AppError("Enter the user's exact email address to confirm deletion", 400);
    }
    await (0, token_service_1.revokeAllUserSessions)(target.id);
    await prisma_1.prisma.user.delete({ where: { id: target.id } });
    await (0, audit_service_1.logAdminAction)(adminId, "USER_DELETED", "User", target.id, `Permanently deleted ${target.email}. Reason: ${reason}`);
}
