"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEvents = listEvents;
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
function rangeWindow(range) {
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
async function listEvents(userId, range) {
    const where = { userId };
    if (range) {
        const { start, end } = rangeWindow(range);
        where.start = { gte: start, lt: end };
    }
    return prisma_1.prisma.calendarEvent.findMany({ where, orderBy: { start: "asc" } });
}
async function createEvent(userId, data) {
    return prisma_1.prisma.calendarEvent.create({
        data: {
            userId, title: data.title, description: data.description,
            start: new Date(data.start), end: new Date(data.end),
            allDay: data.allDay ?? false, location: data.location, type: data.type ?? "OTHER",
        },
    });
}
async function updateEvent(userId, id, data) {
    const existing = await prisma_1.prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Event not found", 404);
    return prisma_1.prisma.calendarEvent.update({
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
async function deleteEvent(userId, id) {
    const existing = await prisma_1.prisma.calendarEvent.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Event not found", 404);
    await prisma_1.prisma.calendarEvent.delete({ where: { id } });
}
