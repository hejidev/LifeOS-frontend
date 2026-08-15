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
async function getCareerDashboard(userId) {
    const [goals, skills, achievements] = await Promise.all([
        prisma_1.prisma.careerGoal.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { targetDate: "asc" }] }),
        prisma_1.prisma.skill.findMany({ where: { userId }, orderBy: { progress: "desc" } }),
        prisma_1.prisma.achievement.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    ]);
    const activeGoals = goals.filter((g) => g.status !== "COMPLETED");
    const completedGoals = goals.filter((g) => g.status === "COMPLETED");
    const overdueGoals = goals.filter((g) => g.targetDate && g.targetDate < new Date() && g.status !== "COMPLETED");
    const avgSkillProgress = skills.length ? Math.round(skills.reduce((s, k) => s + k.progress, 0) / skills.length) : 0;
    let insight = "Add career goals and skills to start tracking your growth.";
    if (goals.length || skills.length) {
        if (overdueGoals.length > 0) {
            insight = `${overdueGoals.length} goal${overdueGoals.length > 1 ? "s are" : " is"} past its target date — consider revisiting timelines.`;
        }
        else if (activeGoals.length === 0 && goals.length > 0) {
            insight = "All career goals completed — nice work. Set a new one to keep momentum.";
        }
        else {
            insight = `${activeGoals.length} active goal${activeGoals.length === 1 ? "" : "s"}, average skill progress ${avgSkillProgress}%.`;
        }
    }
    return {
        goals,
        skills,
        achievements,
        stats: {
            totalGoals: goals.length,
            activeGoals: activeGoals.length,
            completedGoals: completedGoals.length,
            overdueGoals: overdueGoals.length,
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
    return prisma_1.prisma.careerGoal.update({
        where: { id },
        data: {
            ...(data.title && { title: data.title }),
            ...(data.area && { area: data.area }),
            ...(data.status && { status: data.status }),
            ...(data.progress !== undefined && { progress: data.progress }),
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
    const existing = await prisma_1.prisma.skill.findFirst({ where: { userId, name: data.name } });
    if (existing)
        throw new errors_1.AppError("You already have a skill with this name", 409);
    return prisma_1.prisma.skill.create({
        data: { userId, name: data.name, level: data.level ?? "BEGINNER", progress: data.progress ?? 0, category: data.category, relatedGoalId: data.relatedGoalId },
    });
}
async function updateSkill(userId, id, data) {
    const existing = await prisma_1.prisma.skill.findFirst({ where: { id, userId } });
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
