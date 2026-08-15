import { prisma } from "../config/prisma";
import { getFinanceDashboard } from "./finance.service";
import { getStudyDashboard } from "./study.service";
import { getFamilyDashboard } from "./family.service";
import { getVaultDashboard } from "./vault.service";
import { getFocusSuggestions } from "./ai-context.service";

export async function getTodayOverview(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [user, tasks, notes, events, goals] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.task.findMany({
      where: { userId, dueDate: { gte: startOfDay, lt: endOfDay } },
      orderBy: { priority: "asc" },
    }),
    prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.calendarEvent.findMany({
      where: { userId, start: { gte: startOfDay, lt: endOfDay } },
      orderBy: { start: "asc" },
    }),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  const financeDashboard = await getFinanceDashboard(userId);
  const financeSummary = financeDashboard.summary;

  const studyDashboard = await getStudyDashboard(userId, "month");
  const familyDashboard = await getFamilyDashboard(userId);
  const vaultDashboard = await getVaultDashboard(userId);
  const suggestions = await getFocusSuggestions(userId);

  const documents = await prisma.document.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const totalDocs = await prisma.document.count({ where: { userId } });
  const encryptedDocs = await prisma.document.count({
    where: { userId, status: "ACTIVE", fileUrl: { not: null } },
  });
  const expiringSoonDocs = await prisma.document.count({
    where: {
      userId,
      expiresAt: { gte: now, lt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
    },
  });

  const totalMaterials = studyDashboard.materials.length;
  const inProgressMaterials = studyDashboard.materials.filter((m) => m.status === "IN_PROGRESS").length;
  const completedMaterials = studyDashboard.materials.filter((m) => m.status === "COMPLETED").length;
  const nextMaterial =
    studyDashboard.materials.find((m) => m.status === "IN_PROGRESS") ?? studyDashboard.materials[0];

  const todayHealth = await prisma.healthLog.findFirst({
    where: { userId, date: startOfDay },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatarUrl ?? undefined,
      timezone: (user as any).timezone ?? "UTC",
      role: user.role.toLowerCase(),
      location: (user as any).location ?? "",
      preferences: {
        darkMode: (user as any).darkMode ?? false,
        weekStartsOn: (user as any).weekStartsOn ?? 1,
      },
    },
    weather: {
      location: "Lagos",
      temp: 29,
      condition: "Partly cloudy",
      high: 31,
      low: 24,
      icon: "partly-cloudy",
    },
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start.toISOString(),
      type: e.type.toLowerCase(),
    })),
    priorityTasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status === "DONE" ? "done" : t.status === "IN_PROGRESS" ? "in_progress" : "todo",
      priority: t.priority,
      suggestedSchedule: t.suggestedSchedule ?? undefined,
    })),
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      progress: g.progress,
      target: g.target,
      unit: g.unit ?? undefined,
    })),
    recentNotes: notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      summary: n.summary ?? undefined,
      folder: n.folder,
      tags: n.tags,
      linkedTaskIds: n.linkedTaskIds,
      pinned: n.pinned,
      attachments: [],
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
    quote: {
      text: "The future depends on what you do today.",
      author: "Mahatma Gandhi",
    },
    finance: financeSummary,
    family: familyDashboard,
    passwordVault: {
      totalItems: vaultDashboard.stats.totalItems,
      weakCount: vaultDashboard.stats.weakCount,
      reusedCount: vaultDashboard.stats.reusedCount,
      insight: vaultDashboard.insight,
      items: vaultDashboard.items,
    },
    documents: {
      total: totalDocs,
      encrypted: encryptedDocs,
      expiringSoon: expiringSoonDocs,
      recentlyOpened: documents.length,
      linkedTasks: 0,
      linkedNotes: 0,
      recent: documents.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        encrypted: !!d.fileUrl,
        expiresSoon: !!d.expiresAt && d.expiresAt < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      })),
    },
    study: {
      total: totalMaterials,
      inProgress: inProgressMaterials,
      completed: completedMaterials,
      nextMaterialTitle: nextMaterial?.title,
    },
    health: todayHealth
      ? { sleepHours: todayHealth.sleepHours ?? 0, steps: todayHealth.steps ?? 0 }
      : { sleepHours: 0, steps: 0 },
    suggestions,
  };
}