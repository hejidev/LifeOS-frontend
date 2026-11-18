import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { dayBounds, startOfLocalDay } from "../lib/time";

const DAY = 86_400_000;
const MAX_RANGE_DAYS = 120;

const shiftKey = (key: string, days: number) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

async function windowFor(userId: string, range: "today" | "week" | "month") {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true, weekStartsOn: true } });
  const { zone, dateKey } = dayBounds(user?.timezone);

  if (range === "today") {
    return { from: startOfLocalDay(dateKey, zone), to: startOfLocalDay(shiftKey(dateKey, 1), zone) };
  }

  if (range === "week") {
    const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
    const back = (weekday - (user?.weekStartsOn ?? 1) + 7) % 7;
    const startKey = shiftKey(dateKey, -back);
    return { from: startOfLocalDay(startKey, zone), to: startOfLocalDay(shiftKey(startKey, 7), zone) };
  }

  const [year, month] = dateKey.split("-").map(Number);
  const monthKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextKey = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  return { from: startOfLocalDay(monthKey, zone), to: startOfLocalDay(nextKey, zone) };
}

export async function listEvents(userId: string, query: { range?: string; from?: string; to?: string } = {}) {
  const where: any = { userId };

  if (query.from && query.to) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) throw new AppError("Invalid date range", 400);
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY) throw new AppError("That date range is too large", 400);
    where.start = { lt: to };
    where.end = { gt: from };
  } else if (query.range === "today" || query.range === "week" || query.range === "month") {
    const { from, to } = await windowFor(userId, query.range);
    where.start = { gte: from, lt: to };
  }

  return prisma.calendarEvent.findMany({ where, orderBy: { start: "asc" }, take: 500 });
}

export async function createEvent(
  userId: string,
  data: { title: string; description?: string; start: string; end: string; allDay?: boolean; location?: string; type?: string }
) {
  return prisma.calendarEvent.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      start: new Date(data.start),
      end: new Date(data.end),
      allDay: data.allDay ?? false,
      location: data.location,
      type: (data.type as any) ?? "OTHER",
    },
  });
}

export async function updateEvent(userId: string, id: string, data: any) {
  const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Event not found", 404);

  const start = data.start ? new Date(data.start) : existing.start;
  const end = data.end ? new Date(data.end) : existing.end;
  if (end < start) throw new AppError("The event can't end before it starts", 400);

  return prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.start && { start }),
      ...(data.end && { end }),
      ...(data.allDay !== undefined && { allDay: data.allDay }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.type && { type: data.type }),
    },
  });
}

export async function deleteEvent(userId: string, id: string) {
  const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Event not found", 404);
  await prisma.calendarEvent.delete({ where: { id } });
}