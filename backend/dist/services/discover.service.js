"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchEverything = searchEverything;
exports.getSetupStatus = getSetupStatus;
const prisma_1 = require("../config/prisma");
const LIMIT = 5;
const pretty = (value) => value.toLowerCase().replace(/_/g, " ");
async function searchEverything(userId, raw) {
    const q = raw.trim().slice(0, 80);
    if (q.length < 2)
        return [];
    const like = { contains: q, mode: "insensitive" };
    const take = LIMIT;
    const [tasks, notes, documents, goals, habits, materials, events, vault, transactions, careerGoals] = await Promise.all([
        prisma_1.prisma.task.findMany({ where: { userId, OR: [{ title: like }, { tags: { has: q } }] }, orderBy: { updatedAt: "desc" }, take, select: { id: true, title: true, priority: true, status: true } }),
        prisma_1.prisma.note.findMany({ where: { userId, OR: [{ title: like }, { content: like }] }, orderBy: { updatedAt: "desc" }, take, select: { id: true, title: true, folder: true } }),
        prisma_1.prisma.document.findMany({ where: { userId, OR: [{ title: like }, { fileName: like }, { tags: { has: q } }] }, orderBy: { updatedAt: "desc" }, take, select: { id: true, title: true, category: true } }),
        prisma_1.prisma.goal.findMany({ where: { userId, title: like }, orderBy: { updatedAt: "desc" }, take, select: { id: true, title: true, status: true } }),
        prisma_1.prisma.habit.findMany({ where: { userId, archived: false, title: like }, take, select: { id: true, title: true } }),
        prisma_1.prisma.studyMaterial.findMany({ where: { userId, title: like }, orderBy: { updatedAt: "desc" }, take, select: { id: true, title: true, type: true } }),
        prisma_1.prisma.calendarEvent.findMany({ where: { userId, title: like }, orderBy: { start: "desc" }, take, select: { id: true, title: true, start: true } }),
        prisma_1.prisma.vaultItem.findMany({ where: { userId, label: like }, take, select: { id: true, label: true, category: true } }),
        prisma_1.prisma.transaction.findMany({ where: { userId, description: like }, orderBy: { date: "desc" }, take, select: { id: true, description: true, type: true, amount: true, date: true } }),
        prisma_1.prisma.careerGoal.findMany({ where: { userId, title: like }, take, select: { id: true, title: true, status: true } }),
    ]);
    return [
        ...tasks.map((row) => ({ id: row.id, type: "task", title: row.title, subtitle: `${row.priority} · ${pretty(row.status)}`, href: `/app/tasks?id=${row.id}` })),
        ...notes.map((row) => ({ id: row.id, type: "note", title: row.title, subtitle: row.folder, href: `/app/notes?id=${row.id}` })),
        ...documents.map((row) => ({ id: row.id, type: "document", title: row.title, subtitle: pretty(row.category), href: "/app/documents" })),
        ...goals.map((row) => ({ id: row.id, type: "goal", title: row.title, subtitle: pretty(row.status), href: "/app/goals" })),
        ...habits.map((row) => ({ id: row.id, type: "habit", title: row.title, href: "/app/habits" })),
        ...materials.map((row) => ({ id: row.id, type: "study", title: row.title, subtitle: pretty(row.type), href: "/app/study" })),
        ...events.map((row) => ({ id: row.id, type: "event", title: row.title, subtitle: row.start.toISOString().slice(0, 10), href: "/app/calendar" })),
        ...vault.map((row) => ({ id: row.id, type: "vault", title: row.label, subtitle: pretty(row.category), href: "/app/password-vault" })),
        ...transactions.map((row) => ({ id: row.id, type: "transaction", title: row.description, subtitle: `${pretty(row.type)} · ${Number(row.amount).toLocaleString()} · ${row.date.toISOString().slice(0, 10)}`, href: "/app/finance" })),
        ...careerGoals.map((row) => ({ id: row.id, type: "career", title: row.title, subtitle: pretty(row.status), href: "/app/career" })),
    ];
}
async function getSetupStatus(userId) {
    const [user, tasks, notes, accounts, budgets, habits, goals, documents, contacts] = await Promise.all([
        prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { location: true } }),
        prisma_1.prisma.task.count({ where: { userId } }),
        prisma_1.prisma.note.count({ where: { userId } }),
        prisma_1.prisma.financeAccount.count({ where: { userId } }),
        prisma_1.prisma.financeBudget.count({ where: { userId } }),
        prisma_1.prisma.habit.count({ where: { userId, archived: false } }),
        prisma_1.prisma.goal.count({ where: { userId } }),
        prisma_1.prisma.document.count({ where: { userId } }),
        prisma_1.prisma.emergencyContact.count({ where: { profile: { userId } } }),
    ]);
    const steps = [
        { key: "profile", label: "Add your location", hint: "Helps personalise your day", href: "/app/settings", done: !!user?.location },
        { key: "task", label: "Add your first task", hint: "Plan what you'll do today", href: "/app/tasks", done: tasks > 0 },
        { key: "note", label: "Write a note", hint: "Capture an idea before you lose it", href: "/app/notes", done: notes > 0 },
        { key: "account", label: "Add a money account", hint: "Bank, cash or mobile money", href: "/app/finance/budget", done: accounts > 0 },
        { key: "budget", label: "Set a monthly budget", hint: "See how your spending is going", href: "/app/finance/budget", done: budgets > 0 },
        { key: "habit", label: "Start a habit", hint: "Small daily wins add up", href: "/app/habits", done: habits > 0 },
        { key: "goal", label: "Set a goal", hint: "Something worth working toward", href: "/app/goals", done: goals > 0 },
        { key: "document", label: "Store an important document", hint: "Kept private, always at hand", href: "/app/documents", done: documents > 0 },
        { key: "emergency", label: "Add an emergency contact", hint: "Someone to call if the worst happens", href: "/app/emergency-vault", done: contacts > 0 },
    ];
    return { steps, completed: steps.filter((step) => step.done).length, total: steps.length };
}
