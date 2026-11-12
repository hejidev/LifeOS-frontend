"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSuggestions = buildSuggestions;
exports.getAIContext = getAIContext;
exports.getFocusSuggestions = getFocusSuggestions;
const prisma_1 = require("../config/prisma");
const time_1 = require("../lib/time");
const finance_service_1 = require("./finance.service");
function buildSuggestions(context) {
    const suggestions = [];
    context.overdueTasks.forEach((task) => {
        suggestions.push({
            id: `sug-${task.id}`,
            title: task.title,
            reason: "This task is overdue and needs immediate attention",
            priority: 10,
            actionType: "task",
            actionId: task.id,
        });
    });
    context.todayTasks
        .filter((task) => task.priority === "P1" || task.priority === "P2")
        .forEach((task) => {
        suggestions.push({
            id: `sug-${task.id}`,
            title: task.title,
            reason: `High priority task due today${task.dueTime ? ` at ${task.dueTime}` : ""}`,
            priority: 8,
            actionType: "task",
            actionId: task.id,
        });
    });
    const { monthlyBudget, totalSpent } = context.finance;
    if (monthlyBudget > 0 && totalSpent >= monthlyBudget * 0.8) {
        const percent = Math.round((totalSpent / monthlyBudget) * 100);
        suggestions.push({
            id: "sug-finance",
            title: "Review your budget",
            reason: `You've used ${percent}% of this month's budget`,
            priority: 5,
            actionType: "finance",
        });
    }
    if (context.todayEvents.length >= 2) {
        suggestions.push({
            id: "sug-calendar",
            title: "Prepare for a busy schedule",
            reason: `You have ${context.todayEvents.length} events today. Block focus time between them`,
            priority: 6,
            actionType: "calendar",
        });
    }
    return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5);
}
async function getAIContext(userId) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    const { start: startOfDay, end: endOfDay } = (0, time_1.dayBounds)(user?.timezone);
    const [todayTasks, overdueTasks, recentNotes, financeDashboard, todayEvents] = await Promise.all([
        prisma_1.prisma.task.findMany({
            where: { userId, status: { not: "DONE" }, dueDate: { gte: startOfDay, lt: endOfDay } },
            orderBy: { priority: "asc" },
        }),
        prisma_1.prisma.task.findMany({
            where: { userId, status: { not: "DONE" }, dueDate: { lt: startOfDay } },
            orderBy: { dueDate: "asc" },
        }),
        prisma_1.prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 5 }),
        (0, finance_service_1.getFinanceDashboard)(userId),
        prisma_1.prisma.calendarEvent.findMany({
            where: { userId, start: { gte: startOfDay, lt: endOfDay } },
            orderBy: { start: "asc" },
        }),
    ]);
    return {
        todayTasks: todayTasks.map((task) => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            dueTime: task.dueTime ?? null,
        })),
        overdueTasks: overdueTasks.map((task) => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            dueDate: task.dueDate?.toISOString() ?? null,
        })),
        recentNotes: recentNotes.map((note) => ({
            id: note.id,
            title: note.title,
            folder: note.folder,
        })),
        finance: financeDashboard.summary,
        todayEvents: todayEvents.map((event) => ({
            id: event.id,
            title: event.title,
            start: event.start.toISOString(),
            end: event.end.toISOString(),
        })),
    };
}
async function getFocusSuggestions(userId) {
    const context = await getAIContext(userId);
    return buildSuggestions(context);
}
