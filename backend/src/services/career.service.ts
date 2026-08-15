import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

export async function getCareerDashboard(userId: string) {
  const [goals, skills, achievements] = await Promise.all([
    prisma.careerGoal.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { targetDate: "asc" }] }),
    prisma.skill.findMany({ where: { userId }, orderBy: { progress: "desc" } }),
    prisma.achievement.findMany({ where: { userId }, orderBy: { date: "desc" } }),
  ]);

  const activeGoals = goals.filter((g) => g.status !== "COMPLETED");
  const completedGoals = goals.filter((g) => g.status === "COMPLETED");
  const overdueGoals = goals.filter((g) => g.targetDate && g.targetDate < new Date() && g.status !== "COMPLETED");
  const avgSkillProgress = skills.length ? Math.round(skills.reduce((s, k) => s + k.progress, 0) / skills.length) : 0;

  let insight = "Add career goals and skills to start tracking your growth.";
  if (goals.length || skills.length) {
    if (overdueGoals.length > 0) {
      insight = `${overdueGoals.length} goal${overdueGoals.length > 1 ? "s are" : " is"} past its target date — consider revisiting timelines.`;
    } else if (activeGoals.length === 0 && goals.length > 0) {
      insight = "All career goals completed — nice work. Set a new one to keep momentum.";
    } else {
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

export async function createGoal(userId: string, data: { title: string; area: string; targetDate?: string; notes?: string }) {
  return prisma.careerGoal.create({
    data: { userId, title: data.title, area: data.area as any, targetDate: data.targetDate ? new Date(data.targetDate) : undefined, notes: data.notes },
  });
}

export async function updateGoal(userId: string, id: string, data: {
  title?: string; area?: string; status?: string; progress?: number; targetDate?: string; notes?: string;
}) {
  const existing = await prisma.careerGoal.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Goal not found", 404);
  return prisma.careerGoal.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.area && { area: data.area as any }),
      ...(data.status && { status: data.status as any }),
      ...(data.progress !== undefined && { progress: data.progress }),
      ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deleteGoal(userId: string, id: string) {
  const existing = await prisma.careerGoal.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Goal not found", 404);
  await prisma.careerGoal.delete({ where: { id } });
}

export async function createSkill(userId: string, data: {
  name: string; level?: string; progress?: number; category?: string; relatedGoalId?: string;
}) {
  const existing = await prisma.skill.findFirst({ where: { userId, name: data.name } });
  if (existing) throw new AppError("You already have a skill with this name", 409);
  return prisma.skill.create({
    data: { userId, name: data.name, level: (data.level as any) ?? "BEGINNER", progress: data.progress ?? 0, category: data.category, relatedGoalId: data.relatedGoalId },
  });
}

export async function updateSkill(userId: string, id: string, data: {
  name?: string; level?: string; progress?: number; category?: string; relatedGoalId?: string; lastPracticedAt?: string;
}) {
  const existing = await prisma.skill.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Skill not found", 404);
  return prisma.skill.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.level && { level: data.level as any }),
      ...(data.progress !== undefined && { progress: data.progress }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.relatedGoalId !== undefined && { relatedGoalId: data.relatedGoalId }),
      ...(data.lastPracticedAt && { lastPracticedAt: new Date(data.lastPracticedAt) }),
    },
  });
}

export async function deleteSkill(userId: string, id: string) {
  const existing = await prisma.skill.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Skill not found", 404);
  await prisma.skill.delete({ where: { id } });
}

export async function createAchievement(userId: string, data: {
  title: string; type?: string; issuer?: string; date?: string; description?: string; credentialUrl?: string;
}) {
  return prisma.achievement.create({
    data: { userId, title: data.title, type: (data.type as any) ?? "OTHER", issuer: data.issuer, date: data.date ? new Date(data.date) : undefined, description: data.description, credentialUrl: data.credentialUrl },
  });
}

export async function deleteAchievement(userId: string, id: string) {
  const existing = await prisma.achievement.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Achievement not found", 404);
  await prisma.achievement.delete({ where: { id } });
}