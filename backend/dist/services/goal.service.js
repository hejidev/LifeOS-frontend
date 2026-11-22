"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listGoals = listGoals;
exports.createGoal = createGoal;
exports.updateGoal = updateGoal;
exports.deleteGoal = deleteGoal;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const time_1 = require("../lib/time");
const user_clock_1 = require("../lib/user-clock");
const MAX_GOALS = 100;
const view = (goal, todayStart) => ({
    id: goal.id,
    title: goal.title,
    module: goal.module,
    target: goal.target,
    progress: goal.progress,
    unit: goal.unit,
    deadline: goal.deadline ? goal.deadline.toISOString() : null,
    status: goal.status,
    overdue: goal.status === "ACTIVE" && !!goal.deadline && goal.deadline < todayStart,
    createdAt: goal.createdAt.toISOString(),
});
async function todayStart(userId) {
    const clock = await (0, user_clock_1.getUserClock)(userId);
    return (0, time_1.dayBounds)(clock.zone).start;
}
async function listGoals(userId) {
    const [goals, start] = await Promise.all([
        prisma_1.prisma.goal.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { deadline: "asc" }, { createdAt: "desc" }] }),
        todayStart(userId),
    ]);
    return goals.map((goal) => view(goal, start));
}
async function createGoal(userId, data) {
    if ((await prisma_1.prisma.goal.count({ where: { userId } })) >= MAX_GOALS)
        throw new errors_1.AppError(`You can keep up to ${MAX_GOALS} goals`, 400);
    const progress = Math.min(data.progress ?? 0, data.target);
    const goal = await prisma_1.prisma.goal.create({
        data: {
            userId,
            title: data.title,
            module: data.module,
            target: data.target,
            progress,
            unit: data.unit || null,
            deadline: data.deadline ? new Date(data.deadline) : null,
            status: progress >= data.target ? "COMPLETED" : "ACTIVE",
        },
    });
    return view(goal, await todayStart(userId));
}
async function updateGoal(userId, id, data) {
    const existing = await prisma_1.prisma.goal.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Goal not found", 404);
    const target = data.target ?? existing.target;
    let progress = Math.min(data.progress ?? existing.progress, Math.max(target, data.progress ?? 0));
    let status = data.status ?? existing.status;
    if (data.status === "COMPLETED") {
        progress = target;
    }
    else if (data.status === "ACTIVE" && progress >= target) {
        progress = Math.round(target * 0.9 * 100) / 100;
    }
    else if (data.status === undefined) {
        if (progress >= target) {
            status = "COMPLETED";
            progress = target;
        }
        else if (existing.status === "COMPLETED") {
            status = "ACTIVE";
        }
    }
    const goal = await prisma_1.prisma.goal.update({
        where: { id },
        data: {
            ...(data.title && { title: data.title }),
            ...(data.module && { module: data.module }),
            ...(data.unit !== undefined && { unit: data.unit || null }),
            ...(data.deadline !== undefined && { deadline: data.deadline ? new Date(data.deadline) : null }),
            target,
            progress,
            status: status,
        },
    });
    return view(goal, await todayStart(userId));
}
async function deleteGoal(userId, id) {
    const result = await prisma_1.prisma.goal.deleteMany({ where: { id, userId } });
    if (result.count === 0)
        throw new errors_1.AppError("Goal not found", 404);
}
