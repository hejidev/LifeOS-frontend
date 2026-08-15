import { type Task, type Subtask, type Note, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

type TaskWithSubtasks = Task & { subtasks: Subtask[] };

function serializeTask(task: TaskWithSubtasks) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    priority: task.priority as string,
    status: task.status.toLowerCase() as string,
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

export async function getTasks(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { userId },
    include: { subtasks: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  return tasks.map(serializeTask);
}

export async function getTaskById(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { subtasks: true },
  });
  if (!task) throw new AppError("Task not found", 404);
  return serializeTask(task);
}

export async function createTask(userId: string, data: {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  dueTime?: string;
  tags?: string[];
  linkedNoteId?: string;
  recurring?: boolean;
  smartReminder?: boolean;
  subtasks?: { title: string }[];
}) {
  const { subtasks = [], dueDate, priority, ...rest } = data;

  const task = await prisma.task.create({
    data: {
      ...rest,
      userId,
      priority: (priority ?? "P3") as Prisma.EnumTaskPriorityFilter["equals"],
      dueDate: dueDate ? new Date(dueDate) : undefined,
      subtasks: {
        create: subtasks.map((s) => ({ title: s.title })),
      },
    },
    include: { subtasks: true },
  });

  return serializeTask(task);
}

export async function updateTask(userId: string, taskId: string, data: {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  dueTime?: string;
  tags?: string[];
  recurring?: boolean;
  smartReminder?: boolean;
  suggestedSchedule?: string;
}) {
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) throw new AppError("Task not found", 404);

  const { status, priority, dueDate, ...rest } = data;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...rest,
      ...(status && {
        status: status.toUpperCase().replace(/ /g, "_") as Prisma.EnumTaskStatusFilter["equals"],
      }),
      ...(priority && {
        priority: priority as Prisma.EnumTaskPriorityFilter["equals"],
      }),
      ...(dueDate !== undefined && {
        dueDate: dueDate ? new Date(dueDate) : null,
      }),
    },
    include: { subtasks: true },
  });

  return serializeTask(task);
}

export async function deleteTask(userId: string, taskId: string) {
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) throw new AppError("Task not found", 404);
  await prisma.task.delete({ where: { id: taskId } });
}

export async function updateSubtask(
  userId: string,
  taskId: string,
  subtaskId: string,
  completed: boolean
) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw new AppError("Task not found", 404);

  return prisma.subtask.update({
    where: { id: subtaskId },
    data: { completed },
  });
}

export async function convertTaskToNote(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { subtasks: true },
  });
  if (!task) throw new AppError("Task not found", 404);

  const content = [
    `# ${task.title}`,
    task.description ? `\n${task.description}` : "",
    task.subtasks.length
      ? `\n## Subtasks\n${task.subtasks
          .map((s) => `- [${s.completed ? "x" : " "}] ${s.title}`)
          .join("\n")}`
      : "",
  ].join("\n");

  const note = await prisma.note.create({
    data: {
      userId,
      title: task.title,
      content,
      folder: "Personal",
      tags: task.tags,
      linkedTaskIds: [taskId],
    },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { linkedNoteId: note.id },
  });

  return note;
}