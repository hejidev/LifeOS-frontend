"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthSummary = getHealthSummary;
exports.logHealth = logHealth;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const time_1 = require("../lib/time");
const user_clock_1 = require("../lib/user-clock");
const habit_service_1 = require("./habit.service");
const GOALS = { sleepHours: 8, steps: 10000, waterGlasses: 8, workoutsPerWeek: 4 };
const weekdayLabel = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
function average(values) {
    const present = values.filter((value) => typeof value === "number");
    return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}
function buildInsights(input) {
    if (input.logged === 0) {
        return [{ tone: "info", text: "Log today's sleep, steps and water to start seeing your weekly trends." }];
    }
    const out = [];
    const { avgSleep, avgSteps, avgWater } = input;
    if (avgSleep !== null) {
        if (avgSleep < GOALS.sleepHours - 1) {
            out.push({ tone: "warning", text: `You're averaging ${avgSleep.toFixed(1)} h of sleep this week, below your ${GOALS.sleepHours} h goal.` });
        }
        else if (avgSleep >= GOALS.sleepHours - 0.5) {
            out.push({ tone: "success", text: `Sleep is on track at ${avgSleep.toFixed(1)} h a night.` });
        }
        else {
            out.push({ tone: "info", text: `Sleep is averaging ${avgSleep.toFixed(1)} h. A slightly earlier bedtime would reach your ${GOALS.sleepHours} h goal.` });
        }
    }
    if (avgSteps !== null) {
        if (avgSteps >= 8000)
            out.push({ tone: "success", text: `You're averaging ${Math.round(avgSteps).toLocaleString()} steps a day.` });
        else if (avgSteps < 4000)
            out.push({ tone: "warning", text: `Steps are low at ${Math.round(avgSteps).toLocaleString()} a day. A short walk after meals adds up quickly.` });
    }
    if (avgWater !== null && avgWater < GOALS.waterGlasses * 0.6) {
        out.push({ tone: "warning", text: `Hydration is averaging ${avgWater.toFixed(1)} glasses, under your ${GOALS.waterGlasses} glass goal.` });
    }
    out.push({
        tone: input.workouts >= GOALS.workoutsPerWeek ? "success" : "info",
        text: `${input.workouts} of ${GOALS.workoutsPerWeek} workouts done this week.`,
    });
    if (input.habitsTotal > 0 && input.habitsDone < input.habitsTotal) {
        out.push({ tone: "info", text: `${input.habitsDone} of ${input.habitsTotal} habits done today.` });
    }
    return out.slice(0, 4);
}
async function getHealthSummary(userId) {
    const clock = await (0, user_clock_1.getUserClock)(userId);
    const { dateKey } = (0, time_1.dayBounds)(clock.zone);
    const weekday = ((0, time_1.dayNumber)(dateKey) + 4) % 7;
    const weekStartKey = (0, time_1.shiftDateKey)(dateKey, -((weekday - clock.weekStartsOn + 7) % 7));
    const [logs, habitSummary] = await Promise.all([
        prisma_1.prisma.healthLog.findMany({
            where: { userId, date: { gte: (0, time_1.keyToDate)((0, time_1.shiftDateKey)(dateKey, -6)), lte: (0, time_1.keyToDate)(dateKey) } },
            orderBy: { date: "asc" },
        }),
        (0, habit_service_1.getHabitSummary)(userId),
    ]);
    const byKey = new Map(logs.map((log) => [(0, time_1.dateToKey)(log.date), log]));
    const week = Array.from({ length: 7 }, (_, index) => {
        const key = (0, time_1.shiftDateKey)(dateKey, index - 6);
        const log = byKey.get(key);
        return {
            date: key,
            label: weekdayLabel(key),
            sleepHours: log?.sleepHours ?? null,
            steps: log?.steps ?? null,
            waterGlasses: log?.waterGlasses ?? null,
            workoutDone: log?.workoutDone ?? false,
        };
    });
    const todayLog = byKey.get(dateKey);
    const workoutsThisWeek = week.filter((day) => day.date >= weekStartKey && day.workoutDone).length;
    const averages = {
        sleepHours: average(week.map((day) => day.sleepHours)),
        steps: average(week.map((day) => day.steps)),
        waterGlasses: average(week.map((day) => day.waterGlasses)),
    };
    const logged = week.filter((day) => day.sleepHours !== null || day.steps !== null || day.waterGlasses !== null || day.workoutDone).length;
    const habits = habitSummary.habits.map((habit) => ({
        id: habit.id,
        title: habit.title,
        frequency: habit.frequency,
        streak: habit.streak,
        completedToday: habit.completedToday,
        atRisk: !habit.completedToday && habit.streak > 0,
    }));
    const insights = buildInsights({
        avgSleep: averages.sleepHours,
        avgSteps: averages.steps,
        avgWater: averages.waterGlasses,
        logged,
        workouts: workoutsThisWeek,
        habitsDone: habits.filter((habit) => habit.completedToday).length,
        habitsTotal: habits.length,
    });
    return {
        date: dateKey,
        today: {
            sleepHours: todayLog?.sleepHours ?? null,
            steps: todayLog?.steps ?? null,
            waterGlasses: todayLog?.waterGlasses ?? null,
            workoutDone: todayLog?.workoutDone ?? false,
        },
        goals: GOALS,
        week,
        averages,
        loggedDays: logged,
        workoutsThisWeek,
        habits,
        insights,
    };
}
async function logHealth(userId, data) {
    const clock = await (0, user_clock_1.getUserClock)(userId);
    const { dateKey: todayKey } = (0, time_1.dayBounds)(clock.zone);
    const key = data.date ?? todayKey;
    if (key > todayKey)
        throw new errors_1.AppError("You can't log a future date", 400);
    if ((0, time_1.dayNumber)(todayKey) - (0, time_1.dayNumber)(key) > 365)
        throw new errors_1.AppError("That date is too far back", 400);
    const date = (0, time_1.keyToDate)(key);
    const notes = data.notes?.trim();
    return prisma_1.prisma.healthLog.upsert({
        where: { userId_date: { userId, date } },
        update: {
            ...(data.sleepHours !== undefined && { sleepHours: data.sleepHours }),
            ...(data.steps !== undefined && { steps: data.steps }),
            ...(data.waterGlasses !== undefined && { waterGlasses: data.waterGlasses }),
            ...(data.workoutDone !== undefined && { workoutDone: data.workoutDone }),
            ...(notes !== undefined && { notes }),
        },
        create: {
            userId,
            date,
            sleepHours: data.sleepHours,
            steps: data.steps,
            waterGlasses: data.waterGlasses,
            workoutDone: data.workoutDone ?? false,
            notes,
        },
    });
}
