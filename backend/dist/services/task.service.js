"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTasks = getTasks;
exports.getTaskById = getTaskById;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.deleteTask = deleteTask;
exports.updateSubtask = updateSubtask;
exports.convertTaskToNote = convertTaskToNote;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
function serializeTask(task) {
    return {
        id: task.id,
        title: task.title,
        description: task.description ?? undefined,
        priority: task.priority,
        status: task.status.toLowerCase(),
        dueDate: task.dueDate ? task.dueDate.toISOString().split("T")[0] : undefined,
        dueTime: task.dueTime ?? undefined,
        tags: task.tags,
        linkedNoteId: task.linkedNoteId ?? undefined,
        linkedGoalId: task.linkedGoalId ?? undefined,
        linkedBudgetItemId: task.linkedBudgetItemId ?? undefined,
        subtasks: task.subtasks.map((s) => ({
            id: s.id,
            title: s.title,
            completed: s.completed,
        })),
        recurring: task.recurring,
        smartReminder: task.smartReminder,
        suggestedSchedule: task.suggestedSchedule ?? undefined,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
    };
}
async function getTasks(userId) {
    const tasks = await prisma_1.prisma.task.findMany({
        where: { userId },
        include: { subtasks: true },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });
    return tasks.map(serializeTask);
}
async function getTaskById(userId, taskId) {
    const task = await prisma_1.prisma.task.findFirst({
        where: { id: taskId, userId },
        include: { subtasks: true },
    });
    if (!task)
        throw new errors_1.AppError("Task not found", 404);
    return serializeTask(task);
}
async function createTask(userId, data) {
    const { subtasks = [], dueDate, priority, ...rest } = data;
    const task = await prisma_1.prisma.task.create({
        data: {
            ...rest,
            userId,
            priority: (priority ?? "P3"),
            dueDate: dueDate ? new Date(dueDate) : undefined,
            subtasks: {
                create: subtasks.map((s) => ({ title: s.title })),
            },
        },
        include: { subtasks: true },
    });
    return serializeTask(task);
}
async function updateTask(userId, taskId, data) {
    const existing = await prisma_1.prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!existing)
        throw new errors_1.AppError("Task not found", 404);
    const { status, priority, dueDate, ...rest } = data;
    const task = await prisma_1.prisma.task.update({
        where: { id: taskId },
        data: {
            ...rest,
            ...(status && {
                status: status.toUpperCase().replace(/ /g, "_"),
            }),
            ...(priority && {
                priority: priority,
            }),
            ...(dueDate !== undefined && {
                dueDate: dueDate ? new Date(dueDate) : null,
            }),
        },
        include: { subtasks: true },
    });
    return serializeTask(task);
}
async function deleteTask(userId, taskId) {
    const existing = await prisma_1.prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!existing)
        throw new errors_1.AppError("Task not found", 404);
    await prisma_1.prisma.task.delete({ where: { id: taskId } });
}
async function updateSubtask(userId, taskId, subtaskId, completed) {
    const task = await prisma_1.prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task)
        throw new errors_1.AppError("Task not found", 404);
    return prisma_1.prisma.subtask.update({
        where: { id: subtaskId },
        data: { completed },
    });
}
async function convertTaskToNote(userId, taskId) {
    const task = await prisma_1.prisma.task.findFirst({
        where: { id: taskId, userId },
        include: { subtasks: true },
    });
    if (!task)
        throw new errors_1.AppError("Task not found", 404);
    const content = [
        `# ${task.title}`,
        task.description ? `\n${task.description}` : "",
        task.subtasks.length
            ? `\n## Subtasks\n${task.subtasks
                .map((s) => `- [${s.completed ? "x" : " "}] ${s.title}`)
                .join("\n")}`
            : "",
    ].join("\n");
    const note = await prisma_1.prisma.note.create({
        data: {
            userId,
            title: task.title,
            content,
            folder: "Personal",
            tags: task.tags,
            linkedTaskIds: [taskId],
        },
    });
    await prisma_1.prisma.task.update({
        where: { id: taskId },
        data: { linkedNoteId: note.id },
    });
    return note;
}
