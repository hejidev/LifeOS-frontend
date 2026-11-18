"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.updatePreferences = updatePreferences;
exports.updateNotifications = updateNotifications;
exports.changePassword = changePassword;
exports.getAccountOverview = getAccountOverview;
exports.deactivateAccount = deactivateAccount;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const password_policy_1 = require("../lib/password-policy");
const email_service_1 = require("./email.service");
const user_clock_1 = require("../lib/user-clock");
const auth_cache_1 = require("../lib/auth-cache");
function serializeUser(u) {
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl ?? undefined,
        role: u.role.toLowerCase(),
        timezone: u.timezone,
        location: u.location ?? undefined,
        currency: u.currency,
        preferences: {
            darkMode: u.darkMode,
            weekStartsOn: u.weekStartsOn,
        },
        notifications: {
            notifyTasks: u.notifyTasks,
            notifyCalendar: u.notifyCalendar,
            notifyFinance: u.notifyFinance,
        },
        provider: u.provider,
        emailVerified: u.emailVerified,
        hasPassword: !!u.passwordHash,
        createdAt: u.createdAt.toISOString(),
    };
}
async function getProfile(userId) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new errors_1.AppError("User not found", 404);
    return serializeUser(user);
}
async function updateProfile(userId, data) {
    const user = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
            ...(data.timezone !== undefined && { timezone: data.timezone }),
            ...(data.location !== undefined && { location: data.location || null }),
            ...(data.currency !== undefined && { currency: data.currency }),
        },
    });
    (0, user_clock_1.invalidateUserClock)(userId);
    (0, auth_cache_1.invalidateAuthCache)(userId);
    return serializeUser(user);
}
async function updatePreferences(userId, data) {
    const user = await prisma_1.prisma.user.update({ where: { id: userId }, data });
    (0, user_clock_1.invalidateUserClock)(userId);
    return serializeUser(user);
}
async function updateNotifications(userId, data) {
    const user = await prisma_1.prisma.user.update({ where: { id: userId }, data });
    return serializeUser(user);
}
async function changePassword(userId, currentPassword, newPassword) {
    (0, password_policy_1.assertStrongPassword)(newPassword);
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new errors_1.AppError("User not found", 404);
    if (!user.passwordHash) {
        throw new errors_1.AppError("This account signs in via OAuth and has no password to change", 400);
    }
    const valid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!valid)
        throw new errors_1.AppError("Current password is incorrect", 403);
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    (0, auth_cache_1.invalidateAuthCache)(userId);
    await (0, email_service_1.sendPasswordChangedEmail)(user.email, user.name ?? "there");
}
// Aggregated snapshot of everything the user has across LifeOS — powers the
// "your data at a glance" section on the Settings page.
async function getAccountOverview(userId) {
    const [tasks, tasksDone, notes, documents, studyMaterials, transactions, habits, careerGoals, vaultItems, familyMembers, bizProducts, bizSales,] = await Promise.all([
        prisma_1.prisma.task.count({ where: { userId } }),
        prisma_1.prisma.task.count({ where: { userId, status: "DONE" } }),
        prisma_1.prisma.note.count({ where: { userId } }),
        prisma_1.prisma.document.count({ where: { userId } }),
        prisma_1.prisma.studyMaterial.count({ where: { userId } }),
        prisma_1.prisma.transaction.count({ where: { userId } }),
        prisma_1.prisma.habit.count({ where: { userId } }),
        prisma_1.prisma.careerGoal.count({ where: { userId } }),
        prisma_1.prisma.vaultItem.count({ where: { userId } }),
        prisma_1.prisma.familyMember.count({ where: { userId } }),
        prisma_1.prisma.bizProduct.count({ where: { userId } }),
        prisma_1.prisma.bizSale.count({ where: { userId } }),
    ]);
    return {
        modules: [
            { id: "tasks", label: "Tasks", count: tasks, detail: `${tasksDone} completed` },
            { id: "notes", label: "Notes", count: notes },
            { id: "documents", label: "Documents", count: documents },
            { id: "study", label: "Study materials", count: studyMaterials },
            { id: "finance", label: "Transactions", count: transactions },
            { id: "habits", label: "Habits", count: habits },
            { id: "career", label: "Career goals", count: careerGoals },
            { id: "vault", label: "Vault items", count: vaultItems },
            { id: "family", label: "Family members", count: familyMembers },
            { id: "business", label: "Products", count: bizProducts, detail: `${bizSales} sales logged` },
        ],
    };
}
async function deactivateAccount(userId, input) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new errors_1.AppError("User not found", 404);
    const [subscription, business] = await Promise.all([
        prisma_1.prisma.subscription.findUnique({ where: { userId } }),
        prisma_1.prisma.bizProfile.findUnique({ where: { userId }, select: { planStatus: true } }),
    ]);
    if (subscription && subscription.tier !== "FREE" && subscription.status === "ACTIVE") {
        throw new errors_1.AppError("Cancel your subscription before deactivating your account.", 409);
    }
    if (business?.planStatus === "ACTIVE") {
        throw new errors_1.AppError("Cancel your merchant plan before deactivating your account.", 409);
    }
    if (user.passwordHash) {
        if (!input.password || !(await bcryptjs_1.default.compare(input.password, user.passwordHash)))
            throw new errors_1.AppError("Your password is incorrect.", 403);
    }
    else if (input.confirmEmail !== user.email.toLowerCase()) {
        throw new errors_1.AppError("Type your email address to confirm.", 400);
    }
    await prisma_1.prisma.user.update({ where: { id: userId }, data: { isActive: false, sessionVersion: { increment: 1 } } });
    (0, auth_cache_1.invalidateAuthCache)(userId);
}
