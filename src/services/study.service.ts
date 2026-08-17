import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { cloudinary } from "../config/cloudinary";

export async function uploadMaterialFile(buffer: Buffer, originalName: string, mimeType: string) {
  const isImage = mimeType.startsWith("image/");

  const uploaded = await new Promise<{ secure_url: string; bytes: number }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "lifeos/study-materials",
        resource_type: isImage ? "image" : "raw",
      },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

  return {
    url: uploaded.secure_url,
    fileName: originalName,
    fileType: mimeType,
    fileSize: uploaded.bytes,
  };
}

export async function createSubject(userId: string, data: {
  name: string;
  color?: string;
  description?: string;
}) {
  return prisma.studySubject.create({
    data: { userId, name: data.name, color: data.color, description: data.description },
  });
}

export async function updateSubject(userId: string, id: string, data: {
  name?: string;
  color?: string;
  description?: string;
}) {
  const existing = await prisma.studySubject.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Subject not found", 404);

  return prisma.studySubject.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.color && { color: data.color }),
      ...(data.description && { description: data.description }),
    },
  });
}

export async function getSubjects(userId: string) {
  return prisma.studySubject.findMany({ where: { userId }, orderBy: { name: "asc" } });
}

export async function createMaterial(userId: string, data: {
  subjectId?: string;
  title: string;
  type: string;
  url?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  notes?: string;
  targetDate?: string;
}) {
  return prisma.studyMaterial.create({
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
}

export async function updateMaterial(userId: string, id: string, data: {
  subjectId?: string;
  title?: string;
  type?: string;
  url?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  notes?: string;
  status?: string;
  progress?: number;
  targetDate?: string;
}) {
  const existing = await prisma.studyMaterial.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Material not found", 404);

  return prisma.studyMaterial.update({
    where: { id },
    data: {
      ...(data.subjectId && { subjectId: data.subjectId }),
      ...(data.title && { title: data.title }),
      ...(data.type && { type: data.type as any }),
      ...(data.url && { url: data.url }),
      ...(data.fileName && { fileName: data.fileName }),
      ...(data.fileType && { fileType: data.fileType }),
      ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
      ...(data.notes && { notes: data.notes }),
      ...(data.status && { status: data.status as any }),
      ...(data.progress !== undefined && { progress: data.progress }),
      ...(data.targetDate !== undefined && {
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      }),
    },
  });
}

export async function getMaterials(userId: string) {
  return prisma.studyMaterial.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function createSession(userId: string, data: {
  subjectId?: string;
  materialId?: string;
  title: string;
  startedAt?: string;
  notes?: string;
}) {
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

export async function endSession(userId: string, id: string, data: {
  endedAt?: string;
  notes?: string;
}) {
  const existing = await prisma.studySession.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Session not found", 404);

  const endedAt = data.endedAt ? new Date(data.endedAt) : new Date();
  const minutes = Math.max(
    Math.round((endedAt.getTime() - existing.startedAt.getTime()) / 60000),
    1,
  );

  return prisma.studySession.update({
    where: { id },
    data: { endedAt, minutes, notes: data.notes ?? existing.notes },
  });
}

export async function getStudyDashboard(userId: string, range: "today" | "week" | "month" = "month") {
  const now = new Date();
  let start: Date;
  if (range === "today") {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  } else if (range === "week") {
    const day = now.getUTCDay();
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  const [subjects, materials, sessions] = await Promise.all([
    prisma.studySubject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.studyMaterial.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: start } },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const subjectWithStatus = subjects.map((subject) => {
    const subjectMaterials = materials.filter((m) => m.subjectId === subject.id);
    if (subjectMaterials.length === 0) {
      return { ...subject, status: "PLANNED" as const }; // or null
    }

    const hasCompleted = subjectMaterials.some((m) => m.status === "COMPLETED");
    const hasInProgress = subjectMaterials.some((m) => m.status === "IN_PROGRESS");
    const hasOnHold = subjectMaterials.some((m) => m.status === "ON_HOLD");

    let status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" = "PLANNED";

    if (hasInProgress) status = "IN_PROGRESS";
    else if (hasCompleted && !hasInProgress) status = "COMPLETED";
    else if (hasOnHold && !hasInProgress && !hasCompleted) status = "ON_HOLD";

    return { ...subject, status };
  });

  const completedMaterials = materials.filter((m) => m.status === "COMPLETED").length;
  const inProgressMaterials = materials.filter((m) => m.status === "IN_PROGRESS").length;
  const totalStudyMinutes = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);

  const insight =
    totalStudyMinutes > 0
      ? "Your study dashboard reflects actual study sessions and progress."
      : "No study data yet — add materials and start sessions to see insights.";

  return {
    stats: {
      totalSubjects: subjects.length,
      totalMaterials: materials.length,
      completedMaterials,
      inProgressMaterials,
      totalStudyMinutes,
      streakDays: 0,
    },
    subjects: subjectWithStatus,
    materials,
    recentSessions: sessions.slice(0, 10),
    insight,
  };
}

export async function deleteMaterial(userId: string, id: string) {
  const existing = await prisma.studyMaterial.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Material not found", 404);
  await prisma.studyMaterial.delete({ where: { id } });
}