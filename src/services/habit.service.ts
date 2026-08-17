import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoDate(d: Date) {
  return toDateOnly(d).toISOString().split("T")[0];
}

function daysBetween(a: Date, b: Date) {
  return Math.round((toDateOnly(a).getTime() - toDateOnly(b).getTime()) / 86_400_000);
}

// Computes current + longest streak from a list of completion dates (desc order).
function computeStreaks(completionDates: Date[], frequency: string, today: Date) {
  if (completionDates.length === 0) return { current: 0, longest: 0, completedToday: false };

  const days = [...new Set(completionDates.map((d) => isoDate(d)))]
    .map((s) => new Date(s))
    .sort((a, b) => b.getTime() - a.getTime());

  const step = frequency === "weekly" ? 7 : 1;
  const completedToday = isoDate(days[0]) === isoDate(today);

  let current = 0;
  let cursor = completedToday ? today : new Date(today.getTime() - step * 86_400_000);
  for (const d of days) {
    const diff = daysBetween(cursor, d);
    if (diff === 0) {
      current += 1;
      cursor = new Date(cursor.getTime() - step * 86_400_000);
    } else if (diff < 0) {
      continue;
    } else {
      break;
    }
  }
  if (!completedToday && current > 0 && daysBetween(today, days[0]) > step) {
    current = 0; // streak broken — most recent completion is too old
  }

  // Longest streak: walk the sorted unique days and count consecutive runs.
  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const diff = daysBetween(days[i - 1], days[i]);
      run = diff === step ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
  }

  return { current, longest, completedToday };
}

function serializeHabit(h: any, today: Date) {
  const dates = h.completions.map((c: any) => c.date as Date);
  const { current, longest, completedToday } = computeStreaks(dates, h.frequency, today);
  const last30 = [...Array(30)].map((_, i) => {
    const d = new Date(today.getTime() - (29 - i) * 86_400_000);
    const key = isoDate(d);
    return { date: key, completed: dates.some((c: Date) => isoDate(c) === key) };
  });

  return {
    id: h.id,
    title: h.title,
    description: h.description ?? undefined,
    frequency: h.frequency,
    category: h.category?.toLowerCase() ?? "other",
    colorHex: h.colorHex ?? undefined,
    streak: current,
    longestStreak: longest,
    completedToday,
    archived: h.archived,
    last30Days: last30,
    createdAt: h.createdAt.toISOString(),
  };
}

export async function listHabits(userId: string, includeArchived = false) {
  const habits = await prisma.habit.findMany({
    where: { userId, ...(includeArchived ? {} : { archived: false }) },
    include: { completions: { orderBy: { date: "desc" }, take: 90 } },
    orderBy: { createdAt: "asc" },
  });
  const today = new Date();
  return habits.map((h) => serializeHabit(h, today));
}

export async function createHabit(userId: string, data: {
  title: string;
  description?: string;
  frequency?: string;
  category?: string;
  colorHex?: string;
}) {
  const habit = await prisma.habit.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      frequency: data.frequency ?? "daily",
      category: (data.category?.toUpperCase() as any) ?? "OTHER",
      colorHex: data.colorHex,
    },
    include: { completions: true },
  });
  return serializeHabit(habit, new Date());
}

export async function updateHabit(userId: string, id: string, data: {
  title?: string;
  description?: string;
  frequency?: string;
  category?: string;
  colorHex?: string;
  archived?: boolean;
}) {
  const existing = await prisma.habit.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Habit not found", 404);
  const habit = await prisma.habit.update({
    where: { id },
    data: { ...data, ...(data.category && { category: data.category.toUpperCase() as any }) },
    include: { completions: { orderBy: { date: "desc" }, take: 90 } },
  });
  return serializeHabit(habit, new Date());
}

export async function deleteHabit(userId: string, id: string) {
  const existing = await prisma.habit.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Habit not found", 404);
  await prisma.habit.delete({ where: { id } });
}

// Toggles today's completion on/off and returns the updated habit.
export async function toggleCompletion(userId: string, habitId: string) {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) throw new AppError("Habit not found", 404);

  const today = toDateOnly(new Date());
  const existing = await prisma.habitCompletion.findUnique({
    where: { habitId_date: { habitId, date: today } },
  });

  if (existing) {
    await prisma.habitCompletion.delete({ where: { id: existing.id } });
  } else {
    await prisma.habitCompletion.create({ data: { habitId, date: today } });
  }

  const updated = await prisma.habit.findUnique({
    where: { id: habitId },
    include: { completions: { orderBy: { date: "desc" }, take: 90 } },
  });
  return serializeHabit(updated, new Date());
}

export async function getHabitSummary(userId: string) {
  const habits = await listHabits(userId);
  const completionRateToday =
    habits.length === 0
      ? 0
      : Math.round((habits.filter((h) => h.completedToday).length / habits.length) * 100);

  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
  const atRisk = habits.filter((h) => !h.completedToday && h.streak > 0);

  let insight = "Add a habit to start building streaks.";
  if (habits.length > 0) {
    if (completionRateToday === 100) {
      insight = "Perfect day — every habit is checked off. Keep the momentum going.";
    } else if (atRisk.length > 0) {
      insight = `${atRisk[0].title} has a ${atRisk[0].streak}-day streak on the line — complete it today to keep it alive.`;
    } else if (bestStreak >= 7) {
      insight = `Your longest active streak is ${bestStreak} days. Consistency is compounding.`;
    }
  }

  return { habits, completionRateToday, bestStreak, insight };
}