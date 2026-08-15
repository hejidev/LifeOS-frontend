import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

function rangeWindow(range: "today" | "week" | "month") {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1) };
  }
  if (range === "week") {
    const d = new Date(now);
    const day = d.getDay() === 0 ? 7 : d.getDay();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1);
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}

export async function listEvents(userId: string, range?: "today" | "week" | "month") {
  const where: any = { userId };
  if (range) {
    const { start, end } = rangeWindow(range);
    where.start = { gte: start, lt: end };
  }
  return prisma.calendarEvent.findMany({ where, orderBy: { start: "asc" } });
}

export async function createEvent(userId: string, data: {
  title: string; description?: string; start: string; end: string; allDay?: boolean; location?: string; type?: string;
}) {
  return prisma.calendarEvent.create({
    data: {
      userId, title: data.title, description: data.description,
      start: new Date(data.start), end: new Date(data.end),
      allDay: data.allDay ?? false, location: data.location, type: (data.type as any) ?? "OTHER",
    },
  });
}

export async function updateEvent(userId: string, id: string, data: any) {
  const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Event not found", 404);
  return prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.start && { start: new Date(data.start) }),
      ...(data.end && { end: new Date(data.end) }),
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