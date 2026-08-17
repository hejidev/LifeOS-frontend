"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthSummary = getHealthSummary;
exports.logHealth = logHealth;
exports.createHabit = createHabit;
exports.completeHabit = completeHabit;
exports.getHabits = getHabits;
const prisma_1 = require("../config/prisma");
async function getHealthSummary(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLog = await prisma_1.prisma.healthLog.findUnique({
        where: { userId_date: { userId, date: today } },
    });
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const weekLogs = await prisma_1.prisma.healthLog.findMany({
        where: { userId, date: { gte: weekStart, lte: weekEnd } },
    });
    const workoutsThisWeek = weekLogs.filter((l) => l.workoutDone).length;
    const habits = await prisma_1.prisma.habit.findMany({
        where: { userId },
        include: {
            completions: {
                where: { date: today },
            },
        },
    });
    const allCompletions = await prisma_1.prisma.habitCompletion.findMany({
        where: { habitId: { in: habits.map((h) => h.id) } },
        orderBy: { date: "desc" },
    });
    const habitsWithStreaks = habits.map((habit) => {
        const completionDates = allCompletions
            .filter((c) => c.habitId === habit.id)
            .map((c) => c.date.toISOString().split("T")[0]);
        let streak = 0;
        const checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        while (true) {
            const dateStr = checkDate.toISOString().split("T")[0];
            if (completionDates.includes(dateStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            }
            else {
                break;
            }
        }
        return {
            id: habit.id,
            title: habit.title,
            streak,
            completedToday: habit.completions.length > 0,
        };
    });
    function computeTrend(value, target) {
        const ratio = value / target;
        if (ratio >= 1)
            return "up";
        if (ratio < 0.6)
            return "down";
        return "stable";
    }
    const metrics = [
        {
            id: "sleep",
            label: "Sleep",
            value: `${todayLog?.sleepHours ?? 0} h`,
            target: "8 h",
            trend: computeTrend(todayLog?.sleepHours ?? 0, 8),
        },
        {
            id: "steps",
            label: "Steps",
            value: (todayLog?.steps ?? 0).toLocaleString(),
            target: "10,000",
            trend: computeTrend(todayLog?.steps ?? 0, 10000),
        },
        {
            id: "water",
            label: "Water",
            value: `${todayLog?.waterGlasses ?? 0} glasses`,
            target: "8 glasses",
            trend: computeTrend(todayLog?.waterGlasses ?? 0, 8),
        },
        {
            id: "workouts",
            label: "Workouts",
            value: `${workoutsThisWeek} / week`,
            target: "4 / week",
            trend: computeTrend(workoutsThisWeek, 4),
        },
    ];
    const completedHabits = habitsWithStreaks.filter((h) => h.completedToday).length;
    const insight = habits.length === 0
        ? "Add your first habit to start tracking."
        : completedHabits === habits.length
            ? "All habits done today — great consistency!"
            : `${completedHabits} of ${habits.length} habits completed today. Keep going!`;
    return {
        sleepHours: todayLog?.sleepHours ?? 0,
        steps: todayLog?.steps ?? 0,
        waterGlasses: todayLog?.waterGlasses ?? 0,
        workoutsThisWeek,
        insight,
        metrics,
        habits: habitsWithStreaks,
    };
}
async function logHealth(userId, data) {
    const date = data.date ? new Date(data.date) : new Date();
    date.setHours(0, 0, 0, 0);
    const log = await prisma_1.prisma.healthLog.upsert({
        where: { userId_date: { userId, date } },
        update: {
            ...(data.sleepHours !== undefined && { sleepHours: data.sleepHours }),
            ...(data.steps !== undefined && { steps: data.steps }),
            ...(data.waterGlasses !== undefined && { waterGlasses: data.waterGlasses }),
            ...(data.workoutDone !== undefined && { workoutDone: data.workoutDone }),
            ...(data.notes !== undefined && { notes: data.notes }),
        },
        create: {
            userId,
            date,
            sleepHours: data.sleepHours,
            steps: data.steps,
            waterGlasses: data.waterGlasses,
            workoutDone: data.workoutDone ?? false,
            notes: data.notes,
        },
    });
    return log;
}
async function createHabit(userId, data) {
    return prisma_1.prisma.habit.create({
        data: { ...data, userId },
    });
}
async function completeHabit(userId, habitId) {
    const habit = await prisma_1.prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit)
        throw new Error("Habit not found");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma_1.prisma.habitCompletion.upsert({
        where: { habitId_date: { habitId, date: today } },
        update: {},
        create: { habitId, date: today },
    });
    return { success: true };
}
async function getHabits(userId) {
    return prisma_1.prisma.habit.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
    });
}
