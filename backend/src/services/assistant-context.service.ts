import { prisma } from "../config/prisma";
import { dayBounds } from "../lib/time";
import { getFinanceDashboard } from "./finance.service";
import { getHabitSummary } from "./habit.service";

const DAY_MS = 86_400_000;

const dayKey = (date: Date, zone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

const clock = (date: Date, zone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
}

export async function getAssistantContext(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, timezone: true, currency: true } });
  const { zone, dateKey, start, end } = dayBounds(user?.timezone);
  const weekAhead = new Date(end.getTime() + 7 * DAY_MS);
  const now = new Date();

  const [todayTasks, overdueTasks, upcomingTasks, notes, todayEvents, upcomingEvents, goals, finance, habits] = await Promise.all([
    prisma.task.findMany({ where: { userId, status: { not: "DONE" }, dueDate: { gte: start, lt: end } }, orderBy: { priority: "asc" }, take: 15 }),
    prisma.task.findMany({ where: { userId, status: { not: "DONE" }, dueDate: { lt: start } }, orderBy: { dueDate: "asc" }, take: 10 }),
    prisma.task.findMany({ where: { userId, status: { not: "DONE" }, dueDate: { gte: end, lt: weekAhead } }, orderBy: { dueDate: "asc" }, take: 10 }),
    prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, title: true, folder: true, content: true } }),
    prisma.calendarEvent.findMany({ where: { userId, start: { gte: start, lt: end } }, orderBy: { start: "asc" }, take: 15 }),
    prisma.calendarEvent.findMany({ where: { userId, start: { gte: end, lt: weekAhead } }, orderBy: { start: "asc" }, take: 10 }),
    prisma.goal.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 5 }),
    getFinanceDashboard(userId),
    getHabitSummary(userId),
  ]);

  const taskView = (task: { id: string; title: string; priority: string; dueDate: Date | null; dueTime: string | null }) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    dueDate: task.dueDate ? dayKey(task.dueDate, zone) : null,
    dueTime: task.dueTime ?? null,
  });

  const eventView = (event: { id: string; title: string; start: Date; end: Date; allDay: boolean; location: string | null }) => ({
    id: event.id,
    title: event.title,
    date: dayKey(event.start, zone),
    start: clock(event.start, zone),
    end: clock(event.end, zone),
    allDay: event.allDay,
    location: event.location,
  });

  const summary = finance.summary;
  const habitItems = habits.habits.map((habit) => ({
    title: habit.title,
    frequency: habit.frequency,
    streak: habit.streak,
    completedToday: habit.completedToday,
  }));

  return {
    user: { name: user?.name ?? "there", timezone: zone, currency: user?.currency || "NGN" },
    now: {
      date: dateKey,
      weekday: new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "long" }).format(now),
      time: clock(now, zone),
    },
    tasks: { today: todayTasks.map(taskView), overdue: overdueTasks.map(taskView), upcoming: upcomingTasks.map(taskView) },
    events: { today: todayEvents.map(eventView), upcoming: upcomingEvents.map(eventView) },
    notes: notes.map((note) => ({ id: note.id, title: note.title, folder: note.folder, snippet: note.content.replace(/\s+/g, " ").slice(0, 160) })),
    goals: goals.map((goal) => ({ id: goal.id, title: goal.title, progress: goal.progress, target: goal.target, unit: goal.unit ?? null })),
    habits: {
      total: habitItems.length,
      doneToday: habitItems.filter((habit) => habit.completedToday).length,
      atRisk: habitItems.filter((habit) => !habit.completedToday && habit.streak > 0).length,
      items: habitItems,
    },
    finance: {
      currency: summary.currency,
      monthlyBudget: summary.monthlyBudget,
      totalSpent: summary.totalSpent,
      totalIncome: summary.totalIncome,
      topCategories: summary.spendingByCategory.slice(0, 4).map((row) => ({ category: row.category, spent: row.spent })),
      overBudget: summary.categoryBreakdown.filter((row) => row.budget > 0 && row.spent > row.budget).map((row) => row.category),
      insight: summary.insight,
    },
  };
}

export type AssistantContext = Awaited<ReturnType<typeof getAssistantContext>>;

export function buildAssistantPrompt(c: AssistantContext) {
  const money = (value: number) => formatMoney(value, c.finance.currency);
  const list = (items: string[]) => (items.length ? items.map((item) => `- ${item}`) : ["- none"]);
  const task = (t: AssistantContext["tasks"]["today"][number]) =>
    `${t.title} (${t.priority}${t.dueDate ? `, due ${t.dueDate}${t.dueTime ? ` ${t.dueTime}` : ""}` : ""})`;
  const event = (e: AssistantContext["events"]["today"][number]) =>
    `${e.title} ${e.allDay ? "(all day)" : `${e.start}-${e.end}`}${e.location ? ` at ${e.location}` : ""}${e.date !== c.now.date ? ` on ${e.date}` : ""}`;

  return [
    `You are LifeOS Assistant, the personal assistant built into the LifeOS app, talking with ${c.user.name}.`,
    `Right now it is ${c.now.weekday} ${c.now.date}, ${c.now.time} (${c.user.timezone}). Their currency is ${c.user.currency}.`,
    "",
    "How to behave:",
    "- Be concise, warm and practical. Use short paragraphs and simple lists. Reply in the language the user writes in.",
    "- Use only the data below. Never invent tasks, events, notes or amounts. If something isn't in the data, say you don't see it.",
    "- Give specific, actionable suggestions. For medical, legal or investment questions, give general information only.",
    "",
    "Creating things:",
    "- If the user asks you to add or record something, write one short sentence, then exactly one action block and nothing after it.",
    "- The user must confirm before anything is saved, so never say it is already saved. Say you've prepared it.",
    "- Resolve relative dates such as 'tomorrow' from the current date above. Use 24-hour local times. If a needed detail is missing, such as an event's time, ask instead.",
    "- An action block is a fenced block tagged lifeos-action containing valid JSON on one line, for example:",
    "```lifeos-action",
    '{"type":"create_task","title":"Call Mum","dueDate":"YYYY-MM-DD","priority":"P3"}',
    "```",
    "- Allowed types and fields:",
    '  create_task: title, dueDate (optional, YYYY-MM-DD), priority (P1 to P4)',
    '  create_note: title, content',
    '  log_transaction: kind ("expense" or "income"), amount (number), description',
    '  create_event: title, start ("YYYY-MM-DDTHH:mm"), end ("YYYY-MM-DDTHH:mm"), location (optional)',
    "",
    `Tasks due today (${c.tasks.today.length}):`,
    ...list(c.tasks.today.map(task)),
    `Overdue tasks (${c.tasks.overdue.length}):`,
    ...list(c.tasks.overdue.map(task)),
    "Due in the next 7 days:",
    ...list(c.tasks.upcoming.map(task)),
    "",
    `Calendar today (${c.events.today.length}):`,
    ...list(c.events.today.map(event)),
    "Calendar, next 7 days:",
    ...list(c.events.upcoming.map(event)),
    "",
    `Habits: ${c.habits.doneToday} of ${c.habits.total} done today.`,
    ...list(c.habits.items.map((h) => `${h.title}: ${h.streak} ${h.frequency === "weekly" ? "week" : "day"} streak, ${h.completedToday ? "done" : "not done yet"}`)),
    "",
    "Goals:",
    ...list(c.goals.map((g) => `${g.title}: ${g.progress}/${g.target}${g.unit ? ` ${g.unit}` : ""}`)),
    "",
    "Recent notes:",
    ...list(c.notes.map((n) => `${n.title} [${n.folder}]${n.snippet ? `: ${n.snippet}` : ""}`)),
    "",
    "Money this month:",
    c.finance.monthlyBudget > 0
      ? `- Spent ${money(c.finance.totalSpent)} of a ${money(c.finance.monthlyBudget)} budget. Income ${money(c.finance.totalIncome)}.`
      : `- Spent ${money(c.finance.totalSpent)}, no budget set. Income ${money(c.finance.totalIncome)}.`,
    `- Top spending: ${c.finance.topCategories.map((row) => `${row.category} ${money(row.spent)}`).join(", ") || "none yet"}.`,
    c.finance.overBudget.length ? `- Over budget in: ${c.finance.overBudget.join(", ")}.` : "- No category is over budget.",
  ].join("\n");
}