"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayOverview = getTodayOverview;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const time_1 = require("../lib/time");
const finance_service_1 = require("./finance.service");
const study_service_1 = require("./study.service");
const family_service_1 = require("./family.service");
const vault_service_1 = require("./vault.service");
const ai_context_service_1 = require("./ai-context.service");
const DAY_MS = 86400000;
const isPrivateFile = (url) => !!url && url.includes("/authenticated/");
async function getTodayOverview(userId) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new errors_1.AppError("User not found", 404);
    const { start, end, dateOnly } = (0, time_1.dayBounds)(user.timezone);
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * DAY_MS);
    const [tasks, overdue, notes, events, goals, finance, study, family, vault, recentDocs, totalDocs, privateDocs, expiringSoonDocs, todayHealth,] = await Promise.all([
        prisma_1.prisma.task.findMany({ where: { userId, dueDate: { gte: start, lt: end } }, orderBy: { priority: "asc" } }),
        prisma_1.prisma.task.findMany({
            where: { userId, status: { not: "DONE" }, dueDate: { lt: start } },
            orderBy: { dueDate: "asc" },
            take: 10,
            select: { id: true, title: true },
        }),
        prisma_1.prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 5 }),
        prisma_1.prisma.calendarEvent.findMany({ where: { userId, start: { gte: start, lt: end } }, orderBy: { start: "asc" } }),
        prisma_1.prisma.goal.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 5 }),
        (0, finance_service_1.getFinanceDashboard)(userId),
        (0, study_service_1.getStudyDashboard)(userId, "month"),
        (0, family_service_1.getFamilyDashboard)(userId),
        (0, vault_service_1.getVaultDashboard)(userId),
        prisma_1.prisma.document.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 5 }),
        prisma_1.prisma.document.count({ where: { userId } }),
        prisma_1.prisma.document.count({ where: { userId, fileUrl: { contains: "/authenticated/" } } }),
        prisma_1.prisma.document.count({ where: { userId, expiresAt: { gte: now, lt: soon } } }),
        prisma_1.prisma.healthLog.findFirst({ where: { userId, date: dateOnly } }),
    ]);
    const suggestions = (0, ai_context_service_1.buildSuggestions)({
        todayTasks: tasks
            .filter((task) => task.status !== "DONE")
            .map((task) => ({ id: task.id, title: task.title, priority: task.priority, dueTime: task.dueTime ?? null })),
        overdueTasks: overdue,
        todayEvents: events,
        finance: finance.summary,
    });
    const nextMaterial = study.materials.find((material) => material.status === "IN_PROGRESS") ?? study.materials[0];
    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatarUrl ?? undefined,
            timezone: user.timezone,
            role: user.role.toLowerCase(),
            location: user.location ?? "",
            preferences: { darkMode: user.darkMode, weekStartsOn: user.weekStartsOn },
        },
        weather: null,
        events: events.map((event) => ({
            id: event.id,
            title: event.title,
            start: event.start.toISOString(),
            type: event.type.toLowerCase(),
        })),
        priorityTasks: tasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status === "DONE" ? "done" : task.status === "IN_PROGRESS" ? "in_progress" : "todo",
            priority: task.priority,
            suggestedSchedule: task.suggestedSchedule ?? undefined,
        })),
        goals: goals.map((goal) => ({
            id: goal.id,
            title: goal.title,
            progress: goal.progress,
            target: goal.target,
            unit: goal.unit ?? undefined,
        })),
        recentNotes: notes.map((note) => ({
            id: note.id,
            title: note.title,
            content: note.content,
            summary: note.summary ?? note.content.replace(/[#*_>`-]/g, "").trim().slice(0, 120),
            folder: note.folder,
            tags: note.tags,
            linkedTaskIds: note.linkedTaskIds,
            pinned: note.pinned,
            attachments: [],
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
        })),
        quote: { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
        finance: finance.summary,
        family,
        passwordVault: {
            totalItems: vault.stats.totalItems,
            weakCount: vault.stats.weakCount,
            reusedCount: vault.stats.reusedCount,
            insight: vault.insight,
            items: vault.items,
        },
        documents: {
            total: totalDocs,
            encrypted: privateDocs,
            expiringSoon: expiringSoonDocs,
            recentlyOpened: recentDocs.length,
            linkedTasks: 0,
            linkedNotes: 0,
            recent: recentDocs.map((doc) => ({
                id: doc.id,
                title: doc.title,
                category: doc.category,
                encrypted: isPrivateFile(doc.fileUrl),
                expiresSoon: !!doc.expiresAt && doc.expiresAt < soon,
            })),
        },
        study: {
            total: study.materials.length,
            inProgress: study.materials.filter((material) => material.status === "IN_PROGRESS").length,
            completed: study.materials.filter((material) => material.status === "COMPLETED").length,
            nextMaterialTitle: nextMaterial?.title,
        },
        health: todayHealth
            ? { sleepHours: todayHealth.sleepHours ?? 0, steps: todayHealth.steps ?? 0 }
            : { sleepHours: 0, steps: 0 },
        suggestions,
    };
}
