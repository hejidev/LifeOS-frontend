"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecurityOverview = getSecurityOverview;
exports.getFlaggedAccounts = getFlaggedAccounts;
exports.getRecentLoginAttempts = getRecentLoginAttempts;
exports.forceLogoutUser = forceLogoutUser;
const prisma_1 = require("../config/prisma");
const token_service_1 = require("./token.service");
async function getSecurityOverview() {
    const since15m = new Date(Date.now() - 15 * 60 * 1000);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [failedLast15m, failedLast24h, totalUsers, twoFactorAdmins, totalAdmins, recentMerchants] = await Promise.all([
        prisma_1.prisma.loginAttempt.count({ where: { success: false, createdAt: { gte: since15m } } }),
        prisma_1.prisma.loginAttempt.count({ where: { success: false, createdAt: { gte: since24h } } }),
        prisma_1.prisma.user.count(),
        prisma_1.prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, twoFactorEnabled: true } }),
        prisma_1.prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } }),
        prisma_1.prisma.bizProfile.findMany({
            where: { status: "APPROVED" },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { reviewedAt: "desc" },
            take: 10,
        }),
    ]);
    return {
        failedLoginsLast15m: failedLast15m,
        failedLoginsLast24h: failedLast24h,
        totalUsers,
        twoFactorAdoption: totalAdmins > 0 ? Math.round((twoFactorAdmins / totalAdmins) * 100) : 0,
        twoFactorAdmins,
        totalAdmins,
        recentMerchantConversions: recentMerchants.map((m) => ({
            id: m.id,
            businessName: m.businessName,
            userName: m.user.name,
            userEmail: m.user.email,
            convertedAt: m.reviewedAt?.toISOString() ?? null,
        })),
    };
}
async function getFlaggedAccounts() {
    const since15m = new Date(Date.now() - 15 * 60 * 1000);
    const grouped = await prisma_1.prisma.loginAttempt.groupBy({
        by: ["email"],
        where: {
            success: false,
            createdAt: { gte: since15m },
        },
        _count: { email: true },
        having: {
            email: { _count: { gte: 5 } },
        },
    });
    const emails = grouped.map((item) => item.email.toLowerCase());
    const users = await prisma_1.prisma.user.findMany({
        where: {
            email: { in: emails, mode: "insensitive" },
        },
        select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            twoFactorEnabled: true,
        },
    });
    const usersByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
    return grouped.map((attempt) => {
        const user = usersByEmail.get(attempt.email.toLowerCase());
        return {
            email: attempt.email,
            failedAttempts: attempt._count.email,
            userId: user?.id ?? null,
            role: user?.role ?? null,
            isActive: user?.isActive ?? null,
            twoFactorEnabled: user?.twoFactorEnabled ?? null,
        };
    });
}
async function getRecentLoginAttempts(limit = 50) {
    return prisma_1.prisma.loginAttempt.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
async function forceLogoutUser(userId) {
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { sessionVersion: { increment: 1 } },
    });
    await (0, token_service_1.revokeAllUserSessions)(userId);
}
