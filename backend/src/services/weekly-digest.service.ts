import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { unsubscribeUrl } from "../lib/email-links";
import { keyToDate, shiftDateKey, startOfLocalDay } from "../lib/time";
import { sendWeeklyDigestEmail } from "./email.service";

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
}

export async function sendWeeklyDigest(user: { id: string; name: string; email: string; currency: string }, zone: string, dateKey: string) {
  const todayStart = startOfLocalDay(dateKey, zone);
  const since = startOfLocalDay(shiftDateKey(dateKey, -6), zone);
  const sinceDay = keyToDate(shiftDateKey(dateKey, -6));
  const nextFrom = startOfLocalDay(shiftDateKey(dateKey, 1), zone);
  const nextTo = startOfLocalDay(shiftDateKey(dateKey, 8), zone);
  const userId = user.id;

  const [tasksDone, overdue, upcoming, habitCheckins, totals, study, goals] = await Promise.all([
    prisma.task.count({ where: { userId, status: "DONE", updatedAt: { gte: since } } }),
    prisma.task.count({ where: { userId, status: { not: "DONE" }, dueDate: { lt: todayStart } } }),
    prisma.task.findMany({ where: { userId, status: { not: "DONE" }, dueDate: { gte: nextFrom, lt: nextTo } }, orderBy: { dueDate: "asc" }, take: 4, select: { title: true } }),
    prisma.habitCompletion.count({ where: { habit: { userId, archived: false }, date: { gte: sinceDay } } }),
    prisma.transaction.groupBy({ by: ["type"], where: { userId, type: { in: ["INCOME", "EXPENSE"] }, date: { gte: since } }, _sum: { amount: true } }),
    prisma.studySession.aggregate({ where: { userId, endedAt: { not: null }, startedAt: { gte: since } }, _sum: { minutes: true } }),
    prisma.goal.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, take: 3, select: { title: true, target: true, progress: true } }),
  ]);

  const total = (type: string) => Number(totals.find((row) => row.type === type)?._sum.amount ?? 0);
  const spent = total("EXPENSE");
  const income = total("INCOME");
  const studyMinutes = study._sum.minutes ?? 0;

  if (tasksDone + overdue + upcoming.length + habitCheckins + spent + income + studyMinutes === 0) return false;

  await sendWeeklyDigestEmail(user.email, {
    name: user.name,
    tasksDone,
    overdue,
    upcoming: upcoming.map((task) => task.title),
    habitCheckins,
    studyMinutes,
    spent: spent > 0 ? money(spent, user.currency) : null,
    income: income > 0 ? money(income, user.currency) : null,
    goals: goals.map((goal) => ({ title: goal.title, percent: Math.min(100, Math.round((goal.progress / goal.target) * 100)) })),
    dashboardUrl: `${env.FRONTEND_URL.replace(/\/+$/, "")}/app/dashboard`,
    unsubscribeUrl: unsubscribeUrl(user.id, "weekly"),
  });
  return true;
}