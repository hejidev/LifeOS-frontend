"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEvents = listEvents;
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const time_1 = require("../lib/time");
const DAY = 86400000;
const MAX_RANGE_DAYS = 120;
const shiftKey = (key, days) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};
async function windowFor(userId, range) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true, weekStartsOn: true } });
    const { zone, dateKey } = (0, time_1.dayBounds)(user?.timezone);
    if (range === "today") {
        return { from: (0, time_1.startOfLocalDay)(dateKey, zone), to: (0, time_1.startOfLocalDay)(shiftKey(dateKey, 1), zone) };
    }
    if (range === "week") {
        const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
        const back = (weekday - (user?.weekStartsOn ?? 1) + 7) % 7;
        const startKey = shiftKey(dateKey, -back);
        return { from: (0, time_1.startOfLocalDay)(startKey, zone), to: (0, time_1.startOfLocalDay)(shiftKey(startKey, 7), zone) };
    }
    const [year, month] = dateKey.split("-").map(Number);
    const monthKey = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextKey = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    return { from: (0, time_1.startOfLocalDay)(monthKey, zone), to: (0, time_1.startOfLocalDay)(nextKey, zone) };
}
async function listEvents(userId, query = {}) {
    const where = { userId };
    if (query.from && query.to) {
        const from = new Date(query.from);
        const to = new Date(query.to);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from)
            throw new errors_1.AppError("Invalid date range", 400);
        if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY)
            throw new errors_1.AppError("That date range is too large", 400);
        where.start = { lt: to };
        where.end = { gt: from };
    }
    else if (query.range === "today" || query.range === "week" || query.range === "month") {
        const { from, to } = await windowFor(userId, query.range);
        where.start = { gte: from, lt: to };
    }
    return prisma_1.prisma.calendarEvent.findMany({ where, orderBy: { start: "asc" }, take: 500 });
}
async function createEvent(userId, data) {
    return prisma_1.prisma.calendarEvent.create({
        data: {
            userId,
            title: data.title,
            description: data.description,
            start: new Date(data.start),
            end: new Date(data.end),
            allDay: data.allDay ?? false,
            location: data.location,
            type: data.type ?? "OTHER",
        },
    });
}
async function updateEvent(userId, id, data) {
    const existing = await prisma_1.prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Event not found", 404);
    const start = data.start ? new Date(data.start) : existing.start;
    const end = data.end ? new Date(data.end) : existing.end;
    if (end < start)
        throw new errors_1.AppError("The event can't end before it starts", 400);
    return prisma_1.prisma.calendarEvent.update({
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
async function deleteEvent(userId, id) {
    const existing = await prisma_1.prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Event not found", 404);
    await prisma_1.prisma.calendarEvent.delete({ where: { id } });
}
