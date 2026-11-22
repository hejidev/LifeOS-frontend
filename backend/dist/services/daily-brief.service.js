"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrief = getBrief;
exports.generateBrief = generateBrief;
const redis_1 = require("../config/redis");
const ai_provider_1 = require("../lib/ai-provider");
const rate_limit_1 = require("../lib/rate-limit");
const time_1 = require("../lib/time");
const user_clock_1 = require("../lib/user-clock");
const assistant_context_service_1 = require("./assistant-context.service");
const TTL_SECONDS = 20 * 3600;
const cacheKey = (userId, date) => `brief:${userId}:${date}`;
const SYSTEM = [
    "You write a short daily brief for a LifeOS user, like a calm, practical chief of staff.",
    "Write 4 to 6 short lines. Start every line with the bullet character • and write plain text only, with no headings or Markdown.",
    "Cover, where the data allows: today's most important tasks, the schedule, anything overdue, one observation about money, and one habit or goal nudge.",
    "Use only the data provided. Never invent anything. If the day is empty, say so and suggest one small useful step.",
    "Be warm and direct. Keep it under 120 words.",
].join("\n");
function describe(c) {
    const money = (value) => `${c.finance.currency} ${Math.round(value).toLocaleString()}`;
    const task = (t) => `${t.title} (${t.priority}${t.dueTime ? `, ${t.dueTime}` : ""})`;
    const list = (items) => (items.length ? items.join("; ") : "none");
    return [
        `Today is ${c.now.weekday} ${c.now.date}. Name: ${c.user.name}.`,
        `Tasks due today: ${list(c.tasks.today.map(task))}`,
        `Overdue tasks: ${list(c.tasks.overdue.map((t) => t.title))}`,
        `Events today: ${list(c.events.today.map((e) => `${e.title} ${e.allDay ? "(all day)" : e.start}`))}`,
        `Habits: ${c.habits.doneToday} of ${c.habits.total} done today, ${c.habits.atRisk} with a streak at risk.`,
        `Active goals: ${list(c.goals.map((g) => `${g.title} ${g.progress}/${g.target}${g.unit ? ` ${g.unit}` : ""}`))}`,
        c.finance.monthlyBudget > 0
            ? `Money this month: spent ${money(c.finance.totalSpent)} of a ${money(c.finance.monthlyBudget)} budget. Over budget in: ${list(c.finance.overBudget)}.`
            : `Money this month: spent ${money(c.finance.totalSpent)}, no budget set.`,
    ].join("\n");
}
async function todayKey(userId) {
    const clock = await (0, user_clock_1.getUserClock)(userId);
    return (0, time_1.dayBounds)(clock.zone).dateKey;
}
async function getBrief(userId) {
    const cached = await redis_1.redis.get(cacheKey(userId, await todayKey(userId))).catch(() => null);
    return cached ? JSON.parse(cached) : { brief: null };
}
async function generateBrief(userId) {
    await (0, rate_limit_1.consumeLimit)(`rl:brief:${userId}`, 5, 86400, "You've reached today's brief limit.");
    const context = await (0, assistant_context_service_1.getAssistantContext)(userId);
    const brief = await (0, ai_provider_1.completeText)({ system: SYSTEM, prompt: describe(context) });
    const payload = { brief, generatedAt: new Date().toISOString(), date: context.now.date };
    await redis_1.redis.set(cacheKey(userId, context.now.date), JSON.stringify(payload), "EX", TTL_SECONDS).catch(() => undefined);
    return payload;
}
