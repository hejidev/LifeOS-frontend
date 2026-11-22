"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCareerDashboard = getCareerDashboard;
exports.createGoal = createGoal;
exports.updateGoal = updateGoal;
exports.deleteGoal = deleteGoal;
exports.createSkill = createSkill;
exports.updateSkill = updateSkill;
exports.deleteSkill = deleteSkill;
exports.createAchievement = createAchievement;
exports.deleteAchievement = deleteAchievement;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const time_1 = require("../lib/time");
const user_clock_1 = require("../lib/user-clock");
async function assertGoal(userId, goalId) {
    if (goalId && !(await prisma_1.prisma.careerGoal.findFirst({ where: { id: goalId, userId }, select: { id: true } }))) {
        throw new errors_1.AppError("Goal not found", 404);
    }
}
async function getCareerDashboard(userId) {
    const clock = await (0, user_clock_1.getUserClock)(userId);
    const { start: todayStart } = (0, time_1.dayBounds)(clock.zone);
    const [goals, skills, achievements] = await Promise.all([
        prisma_1.prisma.careerGoal.findMany({ where: { userId }, orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }] }),
        prisma_1.prisma.skill.findMany({ where: { userId }, orderBy: { progress: "desc" } }),
        prisma_1.prisma.achievement.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    ]);
    const goalViews = goals.map((goal) => ({
        ...goal,
        overdue: !!goal.targetDate && goal.targetDate < todayStart && goal.status !== "COMPLETED",
    }));
    const active = goalViews.filter((goal) => goal.status !== "COMPLETED");
    const overdue = goalViews.filter((goal) => goal.overdue);
    const avgSkillProgress = skills.length ? Math.round(skills.reduce((sum, skill) => sum + skill.progress, 0) / skills.length) : 0;
    let insight = "Add a goal or a skill to start tracking your growth.";
    if (goals.length || skills.length) {
        if (overdue.length > 0)
            insight = `${overdue.length} ${overdue.length === 1 ? "goal is" : "goals are"} past the target date. Move the date or finish ${overdue.length === 1 ? "it" : "them"}.`;
        else if (active.length === 0 && goals.length > 0)
            insight = "All your goals are complete. Set a new one to keep the momentum.";
        else
            insight = `${active.length} active ${active.length === 1 ? "goal" : "goals"}. Average skill progress is ${avgSkillProgress}%.`;
    }
    return {
        goals: goalViews,
        skills,
        achievements,
        stats: {
            totalGoals: goals.length,
            activeGoals: active.length,
            completedGoals: goals.length - active.length,
            overdueGoals: overdue.length,
            avgSkillProgress,
            totalSkills: skills.length,
            totalAchievements: achievements.length,
        },
        insight,
    };
}
async function createGoal(userId, data) {
    return prisma_1.prisma.careerGoal.create({
        data: { userId, title: data.title, area: data.area, targetDate: data.targetDate ? new Date(data.targetDate) : undefined, notes: data.notes },
    });
}
async function updateGoal(userId, id, data) {
    const existing = await prisma_1.prisma.careerGoal.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Goal not found", 404);
    let status = data.status;
    let progress = data.progress;
    if (status === "COMPLETED") {
        progress = 100;
    }
    else if (status === undefined && progress !== undefined) {
        if (progress >= 100)
            status = "COMPLETED";
        else if (existing.status === "COMPLETED")
            status = "IN_PROGRESS";
        else if (progress > 0 && existing.status === "NOT_STARTED")
            status = "IN_PROGRESS";
    }
    return prisma_1.prisma.careerGoal.update({
        where: { id },
        data: {
            ...(data.title && { title: data.title }),
            ...(data.area && { area: data.area }),
            ...(status && { status: status }),
            ...(progress !== undefined && { progress }),
            ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }),
            ...(data.notes !== undefined && { notes: data.notes }),
        },
    });
}
async function deleteGoal(userId, id) {
    const existing = await prisma_1.prisma.careerGoal.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Goal not found", 404);
    await prisma_1.prisma.careerGoal.delete({ where: { id } });
}
async function createSkill(userId, data) {
    await assertGoal(userId, data.relatedGoalId);
    const existing = await prisma_1.prisma.skill.findFirst({ where: { userId, name: data.name } });
    if (existing)
        throw new errors_1.AppError("You already have a skill with this name", 409);
    return prisma_1.prisma.skill.create({
        data: { userId, name: data.name, level: data.level ?? "BEGINNER", progress: data.progress ?? 0, category: data.category, relatedGoalId: data.relatedGoalId },
    });
}
async function updateSkill(userId, id, data) {
    const existing = await prisma_1.prisma.skill.findFirst({ where: { id, userId } });
    await assertGoal(userId, data.relatedGoalId);
    if (!existing)
        throw new errors_1.AppError("Skill not found", 404);
    return prisma_1.prisma.skill.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.level && { level: data.level }),
            ...(data.progress !== undefined && { progress: data.progress }),
            ...(data.category !== undefined && { category: data.category }),
            ...(data.relatedGoalId !== undefined && { relatedGoalId: data.relatedGoalId }),
            ...(data.lastPracticedAt && { lastPracticedAt: new Date(data.lastPracticedAt) }),
        },
    });
}
async function deleteSkill(userId, id) {
    const existing = await prisma_1.prisma.skill.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Skill not found", 404);
    await prisma_1.prisma.skill.delete({ where: { id } });
}
async function createAchievement(userId, data) {
    return prisma_1.prisma.achievement.create({
        data: { userId, title: data.title, type: data.type ?? "OTHER", issuer: data.issuer, date: data.date ? new Date(data.date) : undefined, description: data.description, credentialUrl: data.credentialUrl },
    });
}
async function deleteAchievement(userId, id) {
    const existing = await prisma_1.prisma.achievement.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Achievement not found", 404);
    await prisma_1.prisma.achievement.delete({ where: { id } });
}
