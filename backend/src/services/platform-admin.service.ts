import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { logAdminAction } from "./audit.service";
import { revokeAllUserSessions } from "./token.service";
import { forgotPassword } from "./auth.service";
import { sendSupportEmailChangeVerification } from "./email.service";
import { redis } from "../config/redis";
import { env } from "../config/env";
import crypto from "crypto";

function serializeUser(u: any) {
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

export async function listUsers(search?: string) {
  const users = await prisma.user.findMany({
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

export async function toggleUserStatus(adminId: string, userId: string) {
  if (adminId === userId) throw new AppError("You cannot suspend your own account", 400);
  const user = await getSupportTarget(userId);
  if (user.role !== "USER") throw new AppError("Manage administrator accounts from the Admins area", 403);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
    include: { subscription: true },
  });

  await logAdminAction(
    adminId,
    updated.isActive ? "USER_ACTIVATED" : "USER_SUSPENDED",
    "User",
    userId,
    `${updated.isActive ? "Activated" : "Suspended"} ${updated.email}`
  );

  return serializeUser(updated);
}

export async function listTenants() {
  const profiles = await prisma.bizProfile.findMany({
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

const TIER_PRICE_USD: Record<string, number> = {
  STARTER: 7, PRO: 15, PREMIUM: 29,
};
const MERCHANT_TIER_PRICE_USD: Record<string, number> = {
  STARTER: 9, GROWTH: 24, PRO: 49,
};

export async function getBillingStats() {
  const [toolSubs, merchantProfiles, totalUsers] = await Promise.all([
    prisma.subscription.findMany({ where: { status: "ACTIVE", tier: { not: "FREE" } } }),
    prisma.bizProfile.findMany({ where: { planStatus: "ACTIVE" } }),
    prisma.user.count(),
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

export async function getAnalytics() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const users = await prisma.user.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true },
  });

  const signupsByMonth = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = d.toLocaleString("en-US", { month: "short" });
    signupsByMonth.set(key, 0);
  }
  for (const u of users) {
    const key = u.createdAt.toLocaleString("en-US", { month: "short" });
    if (signupsByMonth.has(key)) signupsByMonth.set(key, (signupsByMonth.get(key) ?? 0) + 1);
  }
  const signups = Array.from(signupsByMonth.entries()).map(([month, count]) => ({ month, count }));

  const [taskCount, noteCount, financeCount, aiWritingCount, healthCount] = await Promise.all([
    prisma.task.count(),
    prisma.note.count(),
    prisma.transaction.count(),
    prisma.writingDocument.count(),
    prisma.healthLog.count(),
  ]);

  const totalUsers = await prisma.user.count();
  const usageRate = (count: number) => (totalUsers > 0 ? Math.min(100, Math.round((count / totalUsers) * 100)) : 0);

  const moduleUsage = [
    { module: "Tasks", usage: usageRate(taskCount) },
    { module: "Notes", usage: usageRate(noteCount) },
    { module: "Finance", usage: usageRate(financeCount) },
    { module: "AI Writing", usage: usageRate(aiWritingCount) },
    { module: "Health", usage: usageRate(healthCount) },
  ];

  return { signups, moduleUsage };
}

export async function getOverview() {
  const [totalUsers, activeMerchants, pendingApplications, billing, todaySignups] = await Promise.all([
    prisma.user.count(),
    prisma.bizProfile.count({ where: { status: "APPROVED", planStatus: "ACTIVE" } }),
    prisma.bizProfile.count({ where: { status: "PENDING" } }),
    getBillingStats(),
    prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);

  return { totalUsers, activeMerchants, pendingApplications, totalMRR: billing.totalMRR, todaySignups };
}

export async function getAuditLog(limit = 50) {
  const logs = await prisma.adminAuditLog.findMany({
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

export async function getMyPermissions(userId: string, role: string) {
  if (role === "SUPER_ADMIN") {
    return { role, capabilities: ["MANAGE_USERS", "MANAGE_MERCHANTS", "MANAGE_CONTENT", "SEND_BROADCASTS", "VIEW_ANALYTICS", "MESSAGE_USERS"] };
  }
  const perms = await prisma.adminPermission.findMany({ where: { userId } });
  return { role, capabilities: perms.map((p) => p.capability) };
}

async function getSupportTarget(userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User not found", 404);
  if (target.role === "SUPER_ADMIN") {
    throw new AppError("Super-admin accounts must be handled by another super admin through a dedicated recovery process", 403);
  }
  return target;
}

export async function sendSupportPasswordReset(adminId: string, userId: string, reason: string) {
  const target = await getSupportTarget(userId);
  if (!target.passwordHash) throw new AppError("This OAuth account has no password to reset", 400);
  await forgotPassword(target.email);
  await logAdminAction(adminId, "USER_PASSWORD_RESET_SENT", "User", target.id, `Sent password-reset link to ${target.email}. Reason: ${reason}`);
}

export async function requestSupportEmailChange(adminId: string, userId: string, email: string, reason: string) {
  const target = await getSupportTarget(userId);
  const newEmail = email.trim().toLowerCase();
  if (newEmail === target.email.toLowerCase()) throw new AppError("The new email matches the current email", 400);
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) throw new AppError("That email address is already in use", 409);

  const token = crypto.randomBytes(32).toString("hex");
  await redis.set(`support-email-change:${crypto.createHash("sha256").update(token).digest("hex")}`,
    JSON.stringify({ adminId, userId: target.id, newEmail, reason }), "EX", 30 * 60);
  const confirmLink = `${env.FRONTEND_URL}/confirm-email-change?token=${token}`;
  await sendSupportEmailChangeVerification(newEmail, confirmLink);
  await logAdminAction(adminId, "USER_EMAIL_CHANGE_REQUESTED", "User", target.id, `Sent email-change verification to ${newEmail}. Reason: ${reason}`);
}

export async function confirmSupportEmailChange(token: string) {
  const key = `support-email-change:${crypto.createHash("sha256").update(token).digest("hex")}`;
  const raw = await redis.get(key);
  if (!raw) throw new AppError("This email-change link is invalid or has expired", 400);
  const request = JSON.parse(raw) as { adminId: string; userId: string; newEmail: string; reason: string };
  const existing = await prisma.user.findUnique({ where: { email: request.newEmail } });
  if (existing && existing.id !== request.userId) throw new AppError("That email address is already in use", 409);
  const updated = await prisma.user.update({
    where: { id: request.userId },
    data: { email: request.newEmail, emailVerified: true, sessionVersion: { increment: 1 } },
  });
  await Promise.all([redis.del(key), revokeAllUserSessions(updated.id)]);
  await logAdminAction(request.adminId, "USER_EMAIL_CHANGED", "User", updated.id, `Changed account email to ${updated.email}. Reason: ${request.reason}`);
}

export async function resetSupportTwoFactor(adminId: string, userId: string, reason: string) {
  const target = await getSupportTarget(userId);
  if (!target.twoFactorEnabled) throw new AppError("Two-factor authentication is not enabled for this account", 400);
  await prisma.user.update({
    where: { id: target.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, sessionVersion: { increment: 1 } },
  });
  await revokeAllUserSessions(target.id);
  await logAdminAction(adminId, "USER_TWO_FACTOR_RESET", "User", target.id, `Reset two-factor authentication for ${target.email}. Reason: ${reason}`);
}

export async function deleteUser(adminId: string, userId: string, confirmationEmail: string, reason: string) {
  const target = await getSupportTarget(userId);
  if (target.role !== "USER") throw new AppError("Only standard user accounts can be permanently deleted here", 403);
  if (target.email.toLowerCase() !== confirmationEmail.trim().toLowerCase()) {
    throw new AppError("Enter the user's exact email address to confirm deletion", 400);
  }
  await revokeAllUserSessions(target.id);
  await prisma.user.delete({ where: { id: target.id } });
  await logAdminAction(adminId, "USER_DELETED", "User", target.id, `Permanently deleted ${target.email}. Reason: ${reason}`);
}
