"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listGoals = listGoals;
exports.createGoal = createGoal;
exports.updateGoal = updateGoal;
exports.deleteGoal = deleteGoal;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
async function listGoals(userId) {
    return prisma_1.prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}
async function createGoal(userId, data) {
    return prisma_1.prisma.goal.create({
        data: {
            userId, title: data.title, module: data.module ?? "OTHER",
            target: data.target, unit: data.unit,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
        },
    });
}
async function updateGoal(userId, id, data) {
    const existing = await prisma_1.prisma.goal.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Goal not found", 404);
    return prisma_1.prisma.goal.update({
        where: { id },
        data: {
            ...(data.title && { title: data.title }),
            ...(data.progress !== undefined && { progress: data.progress }),
            ...(data.target !== undefined && { target: data.target }),
            ...(data.status && { status: data.status }),
            ...(data.deadline !== undefined && { deadline: data.deadline ? new Date(data.deadline) : null }),
        },
    });
}
async function deleteGoal(userId, id) {
    const existing = await prisma_1.prisma.goal.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Goal not found", 404);
    await prisma_1.prisma.goal.delete({ where: { id } });
}
