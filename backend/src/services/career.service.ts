import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { dayBounds } from "../lib/time";
import { getUserClock } from "../lib/user-clock";

async function assertGoal(userId: string, goalId?: string | null) {
  if (goalId && !(await prisma.careerGoal.findFirst({ where: { id: goalId, userId }, select: { id: true } }))) {
    throw new AppError("Goal not found", 404);
  }
}

export async function getCareerDashboard(userId: string) {
  const clock = await getUserClock(userId);
  const { start: todayStart } = dayBounds(clock.zone);

  const [goals, skills, achievements] = await Promise.all([
    prisma.careerGoal.findMany({ where: { userId }, orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }] }),
    prisma.skill.findMany({ where: { userId }, orderBy: { progress: "desc" } }),
    prisma.achievement.findMany({ where: { userId }, orderBy: { date: "desc" } }),
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
    if (overdue.length > 0) insight = `${overdue.length} ${overdue.length === 1 ? "goal is" : "goals are"} past the target date. Move the date or finish ${overdue.length === 1 ? "it" : "them"}.`;
    else if (active.length === 0 && goals.length > 0) insight = "All your goals are complete. Set a new one to keep the momentum.";
    else insight = `${active.length} active ${active.length === 1 ? "goal" : "goals"}. Average skill progress is ${avgSkillProgress}%.`;
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


export async function createGoal(userId: string, data: { title: string; area: string; targetDate?: string; notes?: string }) {
  return prisma.careerGoal.create({
    data: { userId, title: data.title, area: data.area as any, targetDate: data.targetDate ? new Date(data.targetDate) : undefined, notes: data.notes },
  });
}

export async function updateGoal(
  userId: string,
  id: string,
  data: { title?: string; area?: string; status?: string; progress?: number; targetDate?: string | null; notes?: string | null }
) {
  const existing = await prisma.careerGoal.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Goal not found", 404);

  let status = data.status;
  let progress = data.progress;
  if (status === "COMPLETED") {
    progress = 100;
  } else if (status === undefined && progress !== undefined) {
    if (progress >= 100) status = "COMPLETED";
    else if (existing.status === "COMPLETED") status = "IN_PROGRESS";
    else if (progress > 0 && existing.status === "NOT_STARTED") status = "IN_PROGRESS";
  }

  return prisma.careerGoal.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.area && { area: data.area as any }),
      ...(status && { status: status as any }),
      ...(progress !== undefined && { progress }),
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
  await assertGoal(userId, data.relatedGoalId);
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
  await assertGoal(userId, data.relatedGoalId);
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