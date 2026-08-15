import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { assertStrongPassword } from "../lib/password-policy";

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
    createdAt: u.createdAt.toISOString(),
  };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return serializeUser(user);
}

export async function updateProfile(userId: string, data: {
  name?: string;
  avatarUrl?: string;
  timezone?: string;
  location?: string;
  currency?: string;
}) {
  const user = await prisma.user.update({ where: { id: userId }, data });
  return serializeUser(user);
}

export async function updatePreferences(userId: string, data: { darkMode?: boolean; weekStartsOn?: number }) {
  const user = await prisma.user.update({ where: { id: userId }, data });
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
  if (!valid) throw new AppError("Current password is incorrect", 401);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
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

export async function deactivateAccount(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
}
