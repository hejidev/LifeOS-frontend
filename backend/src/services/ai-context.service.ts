import { prisma } from "../config/prisma";
import { getFinanceDashboard } from "./finance.service";

export async function getAIContext(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [todayTasks, overdueTasks, recentNotes, financeDashboard, todayEvents] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: { not: "DONE" }, dueDate: { gte: startOfDay, lt: endOfDay } },
      orderBy: { priority: "asc" },
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "DONE" }, dueDate: { lt: startOfDay } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 5 }),
    getFinanceDashboard(userId),
    prisma.calendarEvent.findMany({ where: { userId, start: { gte: startOfDay, lt: endOfDay } }, orderBy: { start: "asc" } }),
  ]);

  return {
    todayTasks: todayTasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueTime: (t as any).dueTime ?? null })),
    overdueTasks: overdueTasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate?.toISOString() ?? null })),
    recentNotes: recentNotes.map((n) => ({ id: n.id, title: n.title, folder: n.folder })),
    finance: financeDashboard.summary,
    todayEvents: todayEvents.map((e) => ({ id: e.id, title: e.title, start: e.start.toISOString(), end: e.end.toISOString() })),
  };
}

export async function getFocusSuggestions(userId: string) {
  const context = await getAIContext(userId);
  const suggestions: { id: string; title: string; reason: string; priority: number; actionType: string; actionId?: string }[] = [];

  context.overdueTasks.forEach((t) => {
    suggestions.push({ id: `sug-${t.id}`, title: t.title, reason: "This task is overdue and needs immediate attention", priority: 10, actionType: "task", actionId: t.id });
  });

  context.todayTasks.filter((t) => t.priority === "P1" || t.priority === "P2").forEach((t) => {
    suggestions.push({ id: `sug-${t.id}`, title: t.title, reason: `High priority task due today${t.dueTime ? ` at ${t.dueTime}` : ""}`, priority: 8, actionType: "task", actionId: t.id });
  });

  if (context.finance.insight) {
    suggestions.push({ id: "sug-finance", title: "Review your budget", reason: context.finance.insight, priority: 5, actionType: "finance" });
  }

  if (context.todayEvents.length >= 2) {
    suggestions.push({ id: "sug-calendar", title: "Prepare for a busy schedule", reason: `You have ${context.todayEvents.length} events today — block focus time between them`, priority: 6, actionType: "calendar" });
  }

  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5);
}