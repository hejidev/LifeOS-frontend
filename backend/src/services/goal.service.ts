import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { dayBounds } from "../lib/time";
import { getUserClock } from "../lib/user-clock";

const MAX_GOALS = 100;

type GoalRow = Awaited<ReturnType<typeof prisma.goal.findFirstOrThrow>>;

const view = (goal: GoalRow, todayStart: Date) => ({
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

async function todayStart(userId: string) {
  const clock = await getUserClock(userId);
  return dayBounds(clock.zone).start;
}

export async function listGoals(userId: string) {
  const [goals, start] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { deadline: "asc" }, { createdAt: "desc" }] }),
    todayStart(userId),
  ]);
  return goals.map((goal) => view(goal, start));
}

export async function createGoal(
  userId: string,
  data: { title: string; module: string; target: number; progress?: number; unit?: string; deadline?: string }
) {
  if ((await prisma.goal.count({ where: { userId } })) >= MAX_GOALS) throw new AppError(`You can keep up to ${MAX_GOALS} goals`, 400);

  const progress = Math.min(data.progress ?? 0, data.target);
  const goal = await prisma.goal.create({
    data: {
      userId,
      title: data.title,
      module: data.module as any,
      target: data.target,
      progress,
      unit: data.unit || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      status: progress >= data.target ? "COMPLETED" : "ACTIVE",
    },
  });
  return view(goal, await todayStart(userId));
}

export async function updateGoal(
  userId: string,
  id: string,
  data: { title?: string; module?: string; target?: number; progress?: number; unit?: string | null; deadline?: string | null; status?: string }
) {
  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Goal not found", 404);

  const target = data.target ?? existing.target;
  let progress = Math.min(data.progress ?? existing.progress, Math.max(target, data.progress ?? 0));
  let status = data.status ?? existing.status;

  if (data.status === "COMPLETED") {
    progress = target;
  } else if (data.status === "ACTIVE" && progress >= target) {
    progress = Math.round(target * 0.9 * 100) / 100;
  } else if (data.status === undefined) {
    if (progress >= target) {
      status = "COMPLETED";
      progress = target;
    } else if (existing.status === "COMPLETED") {
      status = "ACTIVE";
    }
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.module && { module: data.module as any }),
      ...(data.unit !== undefined && { unit: data.unit || null }),
      ...(data.deadline !== undefined && { deadline: data.deadline ? new Date(data.deadline) : null }),
      target,
      progress,
      status: status as any,
    },
  });
  return view(goal, await todayStart(userId));
}

export async function deleteGoal(userId: string, id: string) {
  const result = await prisma.goal.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new AppError("Goal not found", 404);
}