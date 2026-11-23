import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logger } from "../lib/logger";
import { localParts, safeZone, type LocalParts } from "../lib/local-time";
import { shiftDateKey, startOfLocalDay } from "../lib/time";
import { getAssistantContext } from "./assistant-context.service";
import { createNotification } from "./notification.service";
import { sendWeeklyDigest } from "./weekly-digest.service";

const BATCH = 200;
const MORNING = { from: 8, to: 11 };
const WEEKLY = { weekday: 0, from: 17, to: 23 };
const DAY = 86_400_000;

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  timezone: true,
  currency: true,
  notifyTasks: true,
  notifyCalendar: true,
  notifyFinance: true,
  notifyDocuments: true,
} as const;

type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

async function claim(userId: string, kind: string, refId: string, period: string) {
  try {
    await prisma.reminderLog.create({ data: { userId, kind, refId, period } });
    return true;
  } catch (err: any) {
    if (err?.code === "P2002") return false;
    throw err;
  }
}

async function forEachUser(where: Prisma.UserWhereInput, handler: (user: UserRow) => Promise<void>) {
  let cursor: string | undefined;
  for (;;) {
    const users = await prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    if (users.length === 0) return;
    for (const user of users) {
      try {
        await handler(user);
      } catch (err) {
        logger.error(`[reminders] user ${user.id} failed:`, err);
      }
    }
    if (users.length < BATCH) return;
    cursor = users[users.length - 1].id;
  }
}

async function zonesMatching(now: Date, match: (parts: LocalParts) => boolean) {
  const rows = await prisma.user.groupBy({ by: ["timezone"], where: { isActive: true } });
  return rows.map((row) => row.timezone).filter((zone) => {
    const parts = localParts(zone, now);
    return !!parts && match(parts);
  });
}

async function morningFor(user: UserRow, parts: LocalParts) {
  const zone = safeZone(user.timezone);
  const start = startOfLocalDay(parts.dateKey, zone);
  const end = startOfLocalDay(shiftDateKey(parts.dateKey, 1), zone);

  if ((user.notifyTasks || user.notifyCalendar) && (await claim(user.id, "morning", "", parts.dateKey))) {
    let dueToday = 0;
    let overdue = 0;
    let events = 0;
    let titles: string[] = [];

    if (user.notifyTasks) {
      const due = { userId: user.id, status: { not: "DONE" as const }, dueDate: { gte: start, lt: end } };
      const [count, rows, late] = await Promise.all([
        prisma.task.count({ where: due }),
        prisma.task.findMany({ where: due, orderBy: { priority: "asc" }, take: 2, select: { title: true } }),
        prisma.task.count({ where: { userId: user.id, status: { not: "DONE" }, dueDate: { lt: start } } }),
      ]);
      dueToday = count;
      titles = rows.map((row) => row.title);
      overdue = late;
    }
    if (user.notifyCalendar) events = await prisma.calendarEvent.count({ where: { userId: user.id, start: { gte: start, lt: end } } });

    const lines: string[] = [];
    if (dueToday > 0) lines.push(`${plural(dueToday, "task")} due today${titles.length ? `: ${titles.join(", ")}${dueToday > titles.length ? "..." : ""}` : ""}`);
    if (overdue > 0) lines.push(`${overdue} overdue`);
    if (events > 0) lines.push(plural(events, "event") + " today");

    if (lines.length > 0) await createNotification(user.id, { type: "INFO", title: "Your day", message: lines.join(" · "), actionUrl: "/app/dashboard" });
  }

  if (user.notifyDocuments) {
    const docs = await prisma.document.findMany({
      where: {
        userId: user.id,
        status: { not: "ARCHIVED" },
        expiresAt: { gte: startOfLocalDay(shiftDateKey(parts.dateKey, -7), zone), lt: startOfLocalDay(shiftDateKey(parts.dateKey, 31), zone) },
      },
      orderBy: { expiresAt: "asc" },
      take: 20,
      select: { id: true, title: true, expiresAt: true },
    });

    const fresh: { title: string; days: number }[] = [];
    for (const doc of docs) {
      const days = Math.floor((doc.expiresAt!.getTime() - start.getTime()) / DAY);
      const bucket = days <= 0 ? 0 : days <= 1 ? 1 : days <= 7 ? 7 : 30;
      if (await claim(user.id, "doc", doc.id, String(bucket))) fresh.push({ title: doc.title, days });
    }

    if (fresh.length === 1) {
      const { title, days } = fresh[0];
      const when = days < 0 ? "has expired" : days === 0 ? "expires today" : days === 1 ? "expires tomorrow" : `expires in ${days} days`;
      await createNotification(user.id, { type: "WARNING", title: "Document expiring", message: `${title} ${when}.`, actionUrl: "/app/documents" });
    } else if (fresh.length > 1) {
      await createNotification(user.id, {
        type: "WARNING",
        title: "Documents need attention",
        message: `${fresh.length} documents are expiring or expired: ${fresh.slice(0, 3).map((item) => item.title).join(", ")}${fresh.length > 3 ? "..." : ""}`,
        actionUrl: "/app/documents",
      });
    }
  }

  if (user.notifyFinance && (await prisma.financeBudget.count({ where: { userId: user.id } })) > 0) {
    const context = await getAssistantContext(user.id);
    const over: string[] = [];
    for (const category of context.finance.overBudget) {
      if (await claim(user.id, "overbudget", category, parts.monthKey)) over.push(category);
    }
    if (over.length > 0) {
      await createNotification(user.id, { type: "WARNING", title: "Over budget", message: `You're over budget in ${over.join(", ")} this month.`, actionUrl: "/app/finance/budget" });
    }
  }
}

async function runMorning(now: Date, onlyUserId: string | undefined, force: boolean) {
  const zones = onlyUserId || force ? null : await zonesMatching(now, (parts) => parts.hour >= MORNING.from && parts.hour <= MORNING.to);
  if (zones && zones.length === 0) return;

  const where: Prisma.UserWhereInput = onlyUserId
    ? { id: onlyUserId }
    : {
        isActive: true,
        ...(zones && { timezone: { in: zones } }),
        OR: [{ notifyTasks: true }, { notifyCalendar: true }, { notifyFinance: true }, { notifyDocuments: true }],
      };

  await forEachUser(where, async (user) => {
    const parts = localParts(safeZone(user.timezone), now);
    if (parts) await morningFor(user, parts);
  });
}

async function runWeekly(now: Date, onlyUserId: string | undefined, force: boolean) {
  const zones = onlyUserId || force ? null : await zonesMatching(now, (parts) => parts.weekday === WEEKLY.weekday && parts.hour >= WEEKLY.from && parts.hour <= WEEKLY.to);
  if (zones && zones.length === 0) return;

  const where: Prisma.UserWhereInput = onlyUserId
    ? { id: onlyUserId }
    : {
        isActive: true,
        notifyWeekly: true,
        emailVerified: true,
        ...(zones && { timezone: { in: zones } }),
        NOT: { email: { endsWith: "@family.invalid" } },
        createdAt: { lt: new Date(now.getTime() - 3 * DAY) },
      };

  await forEachUser(where, async (user) => {
    const zone = safeZone(user.timezone);
    const parts = localParts(zone, now);
    if (!parts || !(await claim(user.id, "weekly", "", parts.dateKey))) return;
    if (await sendWeeklyDigest(user, zone, parts.dateKey)) await sleep(600);
  });
}

export async function runHourlyReminders(options: { onlyUserId?: string; force?: boolean } = {}) {
  const now = new Date();
  const force = !!options.force;
  await runMorning(now, options.onlyUserId, force);
  await runWeekly(now, options.onlyUserId, force);
}

export async function runHousekeeping() {
  const now = Date.now();
  const [read, old, logs] = await Promise.all([
    prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: new Date(now - 60 * DAY) } } }),
    prisma.notification.deleteMany({ where: { createdAt: { lt: new Date(now - 180 * DAY) } } }),
    prisma.reminderLog.deleteMany({ where: { createdAt: { lt: new Date(now - 90 * DAY) } } }),
  ]);
  logger.info(`[housekeeping] removed ${read.count + old.count} notifications and ${logs.count} reminder records`);
}