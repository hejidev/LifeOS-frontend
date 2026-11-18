import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { dateToKey, dayBounds, dayNumber, keyToDate, localDateKey, shiftDateKey } from "../lib/time";
import { getUserClock, type UserClock } from "../lib/user-clock";

const MAX_HABITS = 50;
const HISTORY_DAYS = 400;
const BACKFILL_DAYS = 14;

interface HabitRow {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  category: string | null;
  colorHex: string | null;
  archived: boolean;
  createdAt: Date;
  completions: { date: Date }[];
}

const weekdayOf = (key: string) => (dayNumber(key) + 4) % 7;

function weekStartKey(key: string, weekStartsOn: number) {
  return shiftDateKey(key, -((weekdayOf(key) - weekStartsOn + 7) % 7));
}

function weekIndex(key: string, weekStartsOn: number) {
  const base = (((weekStartsOn - 4) % 7) + 7) % 7;
  return (dayNumber(weekStartKey(key, weekStartsOn)) - base) / 7;
}

function longestRun(units: number[]) {
  let longest = 0;
  let run = 0;
  units.forEach((unit, index) => {
    run = index > 0 && unit - units[index - 1] === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  return longest;
}

function currentRun(units: Set<number>, now: number) {
  let cursor = units.has(now) ? now : now - 1;
  let count = 0;
  while (units.has(cursor)) {
    count += 1;
    cursor -= 1;
  }
  return count;
}

function serialize(habit: HabitRow, todayKey: string, clock: UserClock) {
  const weekly = habit.frequency === "weekly";
  const keys = new Set(habit.completions.map((completion) => dateToKey(completion.date)));
  const unitOf = (key: string) => (weekly ? weekIndex(key, clock.weekStartsOn) : dayNumber(key));
  const units = [...new Set([...keys].map(unitOf))].sort((a, b) => a - b);
  const unitSet = new Set(units);
  const now = unitOf(todayKey);
  const completedToday = unitSet.has(now);

  const last30Days = Array.from({ length: 30 }, (_, index) => {
    const date = shiftDateKey(todayKey, index - 29);
    return { date, completed: keys.has(date) };
  });

  let consistency: number;
  if (weekly) {
    const high = completedToday ? now : now - 1;
    const low = now - 7;
    let done = 0;
    for (let unit = low; unit <= high; unit += 1) if (unitSet.has(unit)) done += 1;
    consistency = Math.round((done / (high - low + 1)) * 100);
  } else {
    const created = localDateKey(clock.zone, habit.createdAt);
    const windowStart = shiftDateKey(todayKey, -29);
    const firstKey = created > windowStart ? created : windowStart;
    const span = last30Days.filter((day) => day.date >= firstKey);
    consistency = span.length ? Math.round((span.filter((day) => day.completed).length / span.length) * 100) : 0;
  }

  return {
    id: habit.id,
    title: habit.title,
    description: habit.description ?? undefined,
    frequency: weekly ? "weekly" : "daily",
    category: habit.category?.toLowerCase() ?? "other",
    colorHex: habit.colorHex ?? undefined,
    streak: currentRun(unitSet, now),
    longestStreak: longestRun(units),
    completedToday,
    archived: habit.archived,
    consistency,
    last30Days,
    createdAt: habit.createdAt.toISOString(),
  };
}

const withCompletions = (todayKey: string) => ({
  completions: { where: { date: { gte: keyToDate(shiftDateKey(todayKey, -HISTORY_DAYS)) } }, select: { date: true } },
});

async function snapshot(userId: string, includeArchived: boolean) {
  const clock = await getUserClock(userId);
  const { dateKey: todayKey } = dayBounds(clock.zone);
  const rows = await prisma.habit.findMany({
    where: { userId, ...(includeArchived ? {} : { archived: false }) },
    include: withCompletions(todayKey),
    orderBy: { createdAt: "asc" },
  });
  return { clock, todayKey, habits: rows.map((row) => serialize(row, todayKey, clock)) };
}

async function viewOf(userId: string, id: string) {
  const clock = await getUserClock(userId);
  const { dateKey: todayKey } = dayBounds(clock.zone);
  const row = await prisma.habit.findFirst({ where: { id, userId }, include: withCompletions(todayKey) });
  if (!row) throw new AppError("Habit not found", 404);
  return serialize(row, todayKey, clock);
}

export async function listHabits(userId: string, includeArchived = false) {
  return (await snapshot(userId, includeArchived)).habits;
}

export async function createHabit(
  userId: string,
  data: { title: string; description?: string; frequency?: string; category?: string; colorHex?: string }
) {
  const count = await prisma.habit.count({ where: { userId, archived: false } });
  if (count >= MAX_HABITS) throw new AppError(`You can track up to ${MAX_HABITS} habits`, 400);

  const habit = await prisma.habit.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      frequency: data.frequency ?? "daily",
      category: (data.category ?? "other").toUpperCase() as any,
      colorHex: data.colorHex,
    },
  });
  return viewOf(userId, habit.id);
}

export async function updateHabit(
  userId: string,
  id: string,
  data: { title?: string; description?: string; frequency?: string; category?: string; colorHex?: string; archived?: boolean }
) {
  const existing = await prisma.habit.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Habit not found", 404);

  await prisma.habit.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.frequency !== undefined && { frequency: data.frequency }),
      ...(data.category !== undefined && { category: data.category.toUpperCase() as any }),
      ...(data.colorHex !== undefined && { colorHex: data.colorHex }),
      ...(data.archived !== undefined && { archived: data.archived }),
    },
  });
  return viewOf(userId, id);
}

export async function deleteHabit(userId: string, id: string) {
  const existing = await prisma.habit.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Habit not found", 404);
  await prisma.habit.delete({ where: { id } });
}

export async function toggleCompletion(userId: string, habitId: string, date?: string) {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId }, select: { id: true, frequency: true } });
  if (!habit) throw new AppError("Habit not found", 404);

  const clock = await getUserClock(userId);
  const { dateKey: todayKey } = dayBounds(clock.zone);
  const targetKey = date ?? todayKey;

  if (targetKey > todayKey) throw new AppError("You can't complete a habit in the future", 400);
  if (dayNumber(todayKey) - dayNumber(targetKey) > BACKFILL_DAYS) {
    throw new AppError(`You can only change the last ${BACKFILL_DAYS} days`, 400);
  }

  const weekly = habit.frequency === "weekly";
  const start = weekly ? weekStartKey(targetKey, clock.weekStartsOn) : targetKey;
  const where = weekly
    ? { habitId, date: { gte: keyToDate(start), lte: keyToDate(shiftDateKey(start, 6)) } }
    : { habitId, date: keyToDate(targetKey) };

  const removed = await prisma.habitCompletion.deleteMany({ where });
  if (removed.count === 0) {
    await prisma.habitCompletion.upsert({
      where: { habitId_date: { habitId, date: keyToDate(targetKey) } },
      update: {},
      create: { habitId, date: keyToDate(targetKey) },
    });
  }

  return viewOf(userId, habitId);
}

export async function getHabitSummary(userId: string) {
  const { todayKey, habits } = await snapshot(userId, false);

  const done = habits.filter((habit) => habit.completedToday).length;
  const completionRateToday = habits.length === 0 ? 0 : Math.round((done / habits.length) * 100);
  const bestStreak = habits.reduce((max, habit) => Math.max(max, habit.streak), 0);
  const bestEver = habits.reduce((max, habit) => Math.max(max, habit.longestStreak), 0);
  const atRisk = habits.filter((habit) => !habit.completedToday && habit.streak > 0).sort((a, b) => b.streak - a.streak);

  const daily = habits.filter((habit) => habit.frequency === "daily");
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(todayKey, index - 6);
    return {
      date,
      label: new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      done: daily.filter((habit) => habit.last30Days.some((day) => day.date === date && day.completed)).length,
      total: daily.length,
    };
  });

  let insight = "Add a habit to start building streaks.";
  if (habits.length > 0) {
    if (completionRateToday === 100) {
      insight = "Every habit is checked off. Keep the momentum going.";
    } else if (atRisk.length > 0) {
      const top = atRisk[0];
      const unit = top.frequency === "weekly" ? "week" : "day";
      insight = `${top.title} has a ${top.streak}-${unit} streak on the line. Complete it ${unit === "week" ? "this week" : "today"} to keep it alive.`;
    } else if (bestStreak >= 7) {
      insight = `Your longest active streak is ${bestStreak}. Consistency is compounding.`;
    } else {
      insight = `${done} of ${habits.length} done. Small repeats beat big pushes.`;
    }
  }

  return { habits, completionRateToday, bestStreak, bestEver, week, insight };
}