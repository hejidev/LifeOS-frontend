import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { assertStrongPassword } from "../lib/password-policy";
import { sendPasswordChangedEmail } from "./email.service";
import { invalidateUserClock } from "../lib/user-clock";
import { invalidateAuthCache } from "../lib/auth-cache";

function serializeUser(u: any) {
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

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return serializeUser(user);
}

export async function updateProfile(
  userId: string,
  data: { name?: string; avatarUrl?: string; timezone?: string; location?: string; currency?: string }
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.location !== undefined && { location: data.location || null }),
      ...(data.currency !== undefined && { currency: data.currency }),
    },
  });
  invalidateUserClock(userId);
  invalidateAuthCache(userId);
  return serializeUser(user);
}

export async function updatePreferences(userId: string, data: { darkMode?: boolean; weekStartsOn?: number }) {
  const user = await prisma.user.update({ where: { id: userId }, data });
  invalidateUserClock(userId);
  return serializeUser(user);
}

export async function updateNotifications(userId: string, data: {
  notifyTasks?: boolean;
  notifyCalendar?: boolean;
  notifyFinance?: boolean;
}) {
  const user = await prisma.user.update({ where: { id: userId }, data });
  return serializeUser(user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  assertStrongPassword(newPassword);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  if (!user.passwordHash) {
    throw new AppError("This account signs in via OAuth and has no password to change", 400);
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError("Current password is incorrect", 403);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  invalidateAuthCache(userId);
  await sendPasswordChangedEmail(user.email, user.name ?? "there");
}

// Aggregated snapshot of everything the user has across LifeOS — powers the
// "your data at a glance" section on the Settings page.
export async function getAccountOverview(userId: string) {
  const [
    tasks,
    tasksDone,
    notes,
    documents,
    studyMaterials,
    transactions,
    habits,
    careerGoals,
    vaultItems,
    familyMembers,
    bizProducts,
    bizSales,
  ] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: "DONE" } }),
    prisma.note.count({ where: { userId } }),
    prisma.document.count({ where: { userId } }),
    prisma.studyMaterial.count({ where: { userId } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.habit.count({ where: { userId } }),
    prisma.careerGoal.count({ where: { userId } }),
    prisma.vaultItem.count({ where: { userId } }),
    prisma.familyMember.count({ where: { userId } }),
    prisma.bizProduct.count({ where: { userId } }),
    prisma.bizSale.count({ where: { userId } }),
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

export async function deactivateAccount(userId: string, input: { password?: string; confirmEmail?: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const [subscription, business] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.bizProfile.findUnique({ where: { userId }, select: { planStatus: true } }),
  ]);
  if (subscription && subscription.tier !== "FREE" && subscription.status === "ACTIVE") {
    throw new AppError("Cancel your subscription before deactivating your account.", 409);
  }
  if (business?.planStatus === "ACTIVE") {
    throw new AppError("Cancel your merchant plan before deactivating your account.", 409);
  }

  if (user.passwordHash) {
    if (!input.password || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError("Your password is incorrect.", 403);
  } else if (input.confirmEmail !== user.email.toLowerCase()) {
    throw new AppError("Type your email address to confirm.", 400);
  }

  await prisma.user.update({ where: { id: userId }, data: { isActive: false, sessionVersion: { increment: 1 } } });
  invalidateAuthCache(userId);
}