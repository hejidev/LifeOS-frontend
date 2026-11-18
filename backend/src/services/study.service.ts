import type { Response } from "express";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { destroyPrivate, isOwnPrivateUrl, streamPrivate, uploadPrivate } from "../lib/private-files";
import { dayBounds, dayNumber, localDateKey, shiftDateKey, startOfLocalDay } from "../lib/time";
import { getUserClock } from "../lib/user-clock";

const FOLDER = "lifeos/study-materials";
const STALE_SESSION_MINUTES = 240;
const MAX_SESSION_MINUTES = 480;
const MAX_SUBJECTS = 100;

const minutesBetween = (from: Date, to: Date) => Math.max(1, Math.round((to.getTime() - from.getTime()) / 60_000));

function present<T extends { url: string | null }>(material: T) {
  const isPrivate = isOwnPrivateUrl(material.url, FOLDER);
  return { ...material, url: isPrivate ? null : material.url, hasFile: isPrivate, isPrivate };
}

async function assertOwned(userId: string, refs: { subjectId?: string | null; materialId?: string | null }) {
  if (refs.subjectId && !(await prisma.studySubject.findFirst({ where: { id: refs.subjectId, userId }, select: { id: true } }))) {
    throw new AppError("Subject not found", 404);
  }
  if (refs.materialId && !(await prisma.studyMaterial.findFirst({ where: { id: refs.materialId, userId }, select: { id: true } }))) {
    throw new AppError("Material not found", 404);
  }
}

export async function uploadMaterialFile(buffer: Buffer, originalName: string, mimeType: string) {
  const uploaded = await uploadPrivate(buffer, FOLDER, mimeType);
  return { url: uploaded.secure_url, fileName: originalName, fileType: mimeType, fileSize: uploaded.bytes };
}

export async function streamMaterialFile(userId: string, id: string, res: Response) {
  const material = await prisma.studyMaterial.findFirst({ where: { id, userId }, select: { url: true, fileName: true, fileType: true } });
  if (!material || !isOwnPrivateUrl(material.url, FOLDER)) throw new AppError("File not found", 404);
  await streamPrivate(material.url, material, res);
}

export async function createSubject(userId: string, data: { name: string; color?: string; description?: string }) {
  if ((await prisma.studySubject.count({ where: { userId } })) >= MAX_SUBJECTS) throw new AppError(`You can have up to ${MAX_SUBJECTS} subjects`, 400);
  return prisma.studySubject.create({ data: { userId, name: data.name, color: data.color, description: data.description } });
}

export async function updateSubject(userId: string, id: string, data: { name?: string; color?: string; description?: string }) {
  const existing = await prisma.studySubject.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Subject not found", 404);

  return prisma.studySubject.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.color && { color: data.color }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
}

export async function getSubjects(userId: string) {
  return prisma.studySubject.findMany({ where: { userId }, orderBy: { name: "asc" } });
}

export async function createMaterial(
  userId: string,
  data: {
    subjectId?: string;
    title: string;
    type: string;
    url?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    notes?: string;
    targetDate?: string;
  }
) {
  await assertOwned(userId, { subjectId: data.subjectId });
  const material = await prisma.studyMaterial.create({
    data: {
      userId,
      subjectId: data.subjectId,
      title: data.title,
      type: data.type as any,
      url: data.url,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      notes: data.notes,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
    },
  });
  return present(material);
}

export async function updateMaterial(
  userId: string,
  id: string,
  data: {
    subjectId?: string | null;
    title?: string;
    type?: string;
    url?: string | null;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    notes?: string | null;
    status?: string;
    progress?: number;
    targetDate?: string | null;
  }
) {
  const existing = await prisma.studyMaterial.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Material not found", 404);
  await assertOwned(userId, { subjectId: data.subjectId });

  const material = await prisma.studyMaterial.update({
    where: { id },
    data: {
      ...(data.subjectId !== undefined && { subjectId: data.subjectId }),
      ...(data.title && { title: data.title }),
      ...(data.type && { type: data.type as any }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.fileName && { fileName: data.fileName }),
      ...(data.fileType && { fileType: data.fileType }),
      ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.status && { status: data.status as any }),
      ...(data.progress !== undefined && { progress: data.progress }),
      ...(data.status === "COMPLETED" && data.progress === undefined && { progress: 100 }),
      ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }),
    },
  });
  return present(material);
}

export async function getMaterials(userId: string) {
  const materials = await prisma.studyMaterial.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return materials.map(present);
}

export async function deleteMaterial(userId: string, id: string) {
  const existing = await prisma.studyMaterial.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Material not found", 404);
  await prisma.studyMaterial.delete({ where: { id } });
  if (isOwnPrivateUrl(existing.url, FOLDER)) void destroyPrivate(existing.url);
}

export async function createSession(
  userId: string,
  data: { subjectId?: string; materialId?: string; title: string; startedAt?: string; notes?: string }
) {
  await assertOwned(userId, { subjectId: data.subjectId, materialId: data.materialId });

  const open = await prisma.studySession.findMany({ where: { userId, endedAt: null } });
  for (const session of open) {
    const endedAt = new Date(Math.min(Date.now(), session.startedAt.getTime() + STALE_SESSION_MINUTES * 60_000));
    await prisma.studySession.update({ where: { id: session.id }, data: { endedAt, minutes: minutesBetween(session.startedAt, endedAt) } });
  }

  return prisma.studySession.create({
    data: {
      userId,
      subjectId: data.subjectId,
      materialId: data.materialId,
      title: data.title,
      startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
      notes: data.notes,
    },
  });
}

export async function endSession(userId: string, id: string, data: { endedAt?: string; notes?: string }) {
  const existing = await prisma.studySession.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Session not found", 404);
  if (existing.endedAt) return existing;

  const requested = data.endedAt ? new Date(data.endedAt) : new Date();
  const limit = existing.startedAt.getTime() + MAX_SESSION_MINUTES * 60_000;
  const endedAt = new Date(Math.max(existing.startedAt.getTime(), Math.min(requested.getTime(), limit)));

  return prisma.studySession.update({
    where: { id },
    data: { endedAt, minutes: minutesBetween(existing.startedAt, endedAt), notes: data.notes ?? existing.notes },
  });
}

const duration = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`);

export async function getStudyDashboard(userId: string, range: "today" | "week" | "month" = "month") {
  const clock = await getUserClock(userId);
  const { zone, dateKey } = dayBounds(clock.zone);

  const weekday = (dayNumber(dateKey) + 4) % 7;
  const startKey =
    range === "today" ? dateKey : range === "week" ? shiftDateKey(dateKey, -((weekday - clock.weekStartsOn + 7) % 7)) : `${dateKey.slice(0, 8)}01`;
  const start = startOfLocalDay(startKey, zone);
  const streakFrom = startOfLocalDay(shiftDateKey(dateKey, -60), zone);

  const [subjects, materials, recent, minutes, history, active] = await Promise.all([
    prisma.studySubject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.studyMaterial.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    prisma.studySession.findMany({ where: { userId, startedAt: { gte: start } }, orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.studySession.aggregate({ where: { userId, startedAt: { gte: start } }, _sum: { minutes: true } }),
    prisma.studySession.findMany({ where: { userId, endedAt: { not: null }, startedAt: { gte: streakFrom } }, select: { startedAt: true } }),
    prisma.studySession.findFirst({ where: { userId, endedAt: null }, orderBy: { startedAt: "desc" } }),
  ]);

  const studiedDays = new Set(history.map((session) => localDateKey(zone, session.startedAt)));
  let streakDays = 0;
  for (let cursor = studiedDays.has(dateKey) ? dateKey : shiftDateKey(dateKey, -1); studiedDays.has(cursor); cursor = shiftDateKey(cursor, -1)) streakDays += 1;

  const subjectWithStatus = subjects.map((subject) => {
    const own = materials.filter((material) => material.subjectId === subject.id);
    const status = own.some((m) => m.status === "IN_PROGRESS")
      ? "IN_PROGRESS"
      : own.length > 0 && own.every((m) => m.status === "COMPLETED")
        ? "COMPLETED"
        : own.some((m) => m.status === "ON_HOLD") && !own.some((m) => m.status === "COMPLETED")
          ? "ON_HOLD"
          : "PLANNED";
    return { ...subject, status, materialCount: own.length };
  });

  const now = new Date();
  const totalStudyMinutes = minutes._sum.minutes ?? 0;
  const completedMaterials = materials.filter((m) => m.status === "COMPLETED").length;
  const inProgressMaterials = materials.filter((m) => m.status === "IN_PROGRESS").length;
  const overdueMaterials = materials.filter((m) => m.targetDate && m.targetDate < now && m.status !== "COMPLETED").length;
  const label = range === "today" ? "today" : range === "week" ? "this week" : "this month";

  const parts: string[] = [];
  if (totalStudyMinutes > 0) parts.push(`You've studied ${duration(totalStudyMinutes)} ${label}.`);
  if (streakDays >= 2) parts.push(`${streakDays}-day study streak.`);
  if (overdueMaterials > 0) parts.push(`${overdueMaterials} ${overdueMaterials === 1 ? "material is" : "materials are"} past the target date.`);

  const insight = parts.length
    ? parts.join(" ")
    : materials.length > 0
      ? "Start a session on a material to build your streak."
      : "Add a material, then start a session to see insights.";

  return {
    stats: { totalSubjects: subjects.length, totalMaterials: materials.length, completedMaterials, inProgressMaterials, totalStudyMinutes, streakDays, overdueMaterials },
    subjects: subjectWithStatus,
    materials: materials.map(present),
    recentSessions: recent,
    activeSession: active ? { id: active.id, title: active.title, materialId: active.materialId, startedAt: active.startedAt.toISOString() } : null,
    insight,
  };
}