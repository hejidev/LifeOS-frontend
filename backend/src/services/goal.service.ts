import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

export async function listGoals(userId: string) {
  return prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function createGoal(userId: string, data: { title: string; module?: string; target: number; unit?: string; deadline?: string }) {
  return prisma.goal.create({
    data: {
      userId, title: data.title, module: (data.module as any) ?? "OTHER",
      target: data.target, unit: data.unit,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    },
  });
}

export async function updateGoal(userId: string, id: string, data: any) {
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Goal not found", 404);
  return prisma.goal.update({
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

export async function deleteGoal(userId: string, id: string) {
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Goal not found", 404);
  await prisma.goal.delete({ where: { id } });
}