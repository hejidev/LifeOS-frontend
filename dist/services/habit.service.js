"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listHabits = listHabits;
exports.createHabit = createHabit;
exports.updateHabit = updateHabit;
exports.deleteHabit = deleteHabit;
exports.toggleCompletion = toggleCompletion;
exports.getHabitSummary = getHabitSummary;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
function toDateOnly(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isoDate(d) {
    return toDateOnly(d).toISOString().split("T")[0];
}
function daysBetween(a, b) {
    return Math.round((toDateOnly(a).getTime() - toDateOnly(b).getTime()) / 86400000);
}
// Computes current + longest streak from a list of completion dates (desc order).
function computeStreaks(completionDates, frequency, today) {
    if (completionDates.length === 0)
        return { current: 0, longest: 0, completedToday: false };
    const days = [...new Set(completionDates.map((d) => isoDate(d)))]
        .map((s) => new Date(s))
        .sort((a, b) => b.getTime() - a.getTime());
    const step = frequency === "weekly" ? 7 : 1;
    const completedToday = isoDate(days[0]) === isoDate(today);
    let current = 0;
    let cursor = completedToday ? today : new Date(today.getTime() - step * 86400000);
    for (const d of days) {
        const diff = daysBetween(cursor, d);
        if (diff === 0) {
            current += 1;
            cursor = new Date(cursor.getTime() - step * 86400000);
        }
        else if (diff < 0) {
            continue;
        }
        else {
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
        }
        else {
            const diff = daysBetween(days[i - 1], days[i]);
            run = diff === step ? run + 1 : 1;
        }
        longest = Math.max(longest, run);
    }
    return { current, longest, completedToday };
}
function serializeHabit(h, today) {
    const dates = h.completions.map((c) => c.date);
    const { current, longest, completedToday } = computeStreaks(dates, h.frequency, today);
    const last30 = [...Array(30)].map((_, i) => {
        const d = new Date(today.getTime() - (29 - i) * 86400000);
        const key = isoDate(d);
        return { date: key, completed: dates.some((c) => isoDate(c) === key) };
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
async function listHabits(userId, includeArchived = false) {
    const habits = await prisma_1.prisma.habit.findMany({
        where: { userId, ...(includeArchived ? {} : { archived: false }) },
        include: { completions: { orderBy: { date: "desc" }, take: 90 } },
        orderBy: { createdAt: "asc" },
    });
    const today = new Date();
    return habits.map((h) => serializeHabit(h, today));
}
async function createHabit(userId, data) {
    const habit = await prisma_1.prisma.habit.create({
        data: {
            userId,
            title: data.title,
            description: data.description,
            frequency: data.frequency ?? "daily",
            category: data.category?.toUpperCase() ?? "OTHER",
            colorHex: data.colorHex,
        },
        include: { completions: true },
    });
    return serializeHabit(habit, new Date());
}
async function updateHabit(userId, id, data) {
    const existing = await prisma_1.prisma.habit.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Habit not found", 404);
    const habit = await prisma_1.prisma.habit.update({
        where: { id },
        data: { ...data, ...(data.category && { category: data.category.toUpperCase() }) },
        include: { completions: { orderBy: { date: "desc" }, take: 90 } },
    });
    return serializeHabit(habit, new Date());
}
async function deleteHabit(userId, id) {
    const existing = await prisma_1.prisma.habit.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Habit not found", 404);
    await prisma_1.prisma.habit.delete({ where: { id } });
}
// Toggles today's completion on/off and returns the updated habit.
async function toggleCompletion(userId, habitId) {
    const habit = await prisma_1.prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit)
        throw new errors_1.AppError("Habit not found", 404);
    const today = toDateOnly(new Date());
    const existing = await prisma_1.prisma.habitCompletion.findUnique({
        where: { habitId_date: { habitId, date: today } },
    });
    if (existing) {
        await prisma_1.prisma.habitCompletion.delete({ where: { id: existing.id } });
    }
    else {
        await prisma_1.prisma.habitCompletion.create({ data: { habitId, date: today } });
    }
    const updated = await prisma_1.prisma.habit.findUnique({
        where: { id: habitId },
        include: { completions: { orderBy: { date: "desc" }, take: 90 } },
    });
    return serializeHabit(updated, new Date());
}
async function getHabitSummary(userId) {
    const habits = await listHabits(userId);
    const completionRateToday = habits.length === 0
        ? 0
        : Math.round((habits.filter((h) => h.completedToday).length / habits.length) * 100);
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
    const atRisk = habits.filter((h) => !h.completedToday && h.streak > 0);
    let insight = "Add a habit to start building streaks.";
    if (habits.length > 0) {
        if (completionRateToday === 100) {
            insight = "Perfect day — every habit is checked off. Keep the momentum going.";
        }
        else if (atRisk.length > 0) {
            insight = `${atRisk[0].title} has a ${atRisk[0].streak}-day streak on the line — complete it today to keep it alive.`;
        }
        else if (bestStreak >= 7) {
            insight = `Your longest active streak is ${bestStreak} days. Consistency is compounding.`;
        }
    }
    return { habits, completionRateToday, bestStreak, insight };
}
