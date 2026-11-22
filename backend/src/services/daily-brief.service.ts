import { redis } from "../config/redis";
import { completeText } from "../lib/ai-provider";
import { consumeLimit } from "../lib/rate-limit";
import { dayBounds } from "../lib/time";
import { getUserClock } from "../lib/user-clock";
import { getAssistantContext, type AssistantContext } from "./assistant-context.service";

const TTL_SECONDS = 20 * 3600;
const cacheKey = (userId: string, date: string) => `brief:${userId}:${date}`;

interface BriefPayload {
  brief: string;
  generatedAt: string;
  date: string;
}

const SYSTEM = [
  "You write a short daily brief for a LifeOS user, like a calm, practical chief of staff.",
  "Write 4 to 6 short lines. Start every line with the bullet character • and write plain text only, with no headings or Markdown.",
  "Cover, where the data allows: today's most important tasks, the schedule, anything overdue, one observation about money, and one habit or goal nudge.",
  "Use only the data provided. Never invent anything. If the day is empty, say so and suggest one small useful step.",
  "Be warm and direct. Keep it under 120 words.",
].join("\n");

function describe(c: AssistantContext) {
  const money = (value: number) => `${c.finance.currency} ${Math.round(value).toLocaleString()}`;
  const task = (t: { title: string; priority: string; dueTime: string | null }) => `${t.title} (${t.priority}${t.dueTime ? `, ${t.dueTime}` : ""})`;
  const list = (items: string[]) => (items.length ? items.join("; ") : "none");

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

async function todayKey(userId: string) {
  const clock = await getUserClock(userId);
  return dayBounds(clock.zone).dateKey;
}

export async function getBrief(userId: string): Promise<BriefPayload | { brief: null }> {
  const cached = await redis.get(cacheKey(userId, await todayKey(userId))).catch(() => null);
  return cached ? (JSON.parse(cached) as BriefPayload) : { brief: null };
}

export async function generateBrief(userId: string): Promise<BriefPayload> {
  await consumeLimit(`rl:brief:${userId}`, 5, 86_400, "You've reached today's brief limit.");

  const context = await getAssistantContext(userId);
  const brief = await completeText({ system: SYSTEM, prompt: describe(context) });
  const payload: BriefPayload = { brief, generatedAt: new Date().toISOString(), date: context.now.date };

  await redis.set(cacheKey(userId, context.now.date), JSON.stringify(payload), "EX", TTL_SECONDS).catch(() => undefined);
  return payload;
}