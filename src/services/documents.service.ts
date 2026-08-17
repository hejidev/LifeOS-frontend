import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { cloudinary } from "../config/cloudinary";

export async function uploadDocumentFile(buffer: Buffer, originalName: string, mimeType: string) {
  const isImage = mimeType.startsWith("image/");

  const uploaded = await new Promise<{ secure_url: string; bytes: number }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "lifeos/documents",
        resource_type: isImage ? "image" : "raw",
      },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

  return {
    fileUrl: uploaded.secure_url,
    fileName: originalName,
    fileType: mimeType,
    fileSize: uploaded.bytes,
  };
}

export async function createFolder(userId: string, data: {
  name: string;
  description?: string;
}) {
  return prisma.documentFolder.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
    },
  });
}

export async function updateFolder(userId: string, id: string, data: {
  name?: string;
  description?: string;
}) {
  const existing = await prisma.documentFolder.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Folder not found", 404);

  return prisma.documentFolder.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
    },
  });
}

export async function deleteFolder(userId: string, id: string) {
  const existing = await prisma.documentFolder.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Folder not found", 404);

  const docsCount = await prisma.document.count({ where: { folderId: id, userId } });
  if (docsCount > 0) {
    throw new AppError("Cannot delete folder with documents", 400);
  }

  await prisma.documentFolder.delete({ where: { id } });
}

export async function createDocument(userId: string, data: {
  folderId?: string;
  title: string;
  category: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  tags?: string[];
  summary?: string;
  expiresAt?: string;
  linkedNoteId?: string;
  linkedTaskId?: string;
}) {
  return prisma.document.create({
    data: {
      userId,
      folderId: data.folderId,
      title: data.title,
      category: data.category as any,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      tags: data.tags ?? [],
      summary: data.summary,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      linkedNoteId: data.linkedNoteId,
      linkedTaskId: data.linkedTaskId,
    },
  });
}

export async function updateDocument(userId: string, id: string, data: {
  folderId?: string;
  title?: string;
  category?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  tags?: string[];
  summary?: string;
  expiresAt?: string;
  status?: string;
}) {
  const existing = await prisma.document.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Document not found", 404);

  return prisma.document.update({
    where: { id },
    data: {
      ...(data.folderId && { folderId: data.folderId }),
      ...(data.title && { title: data.title }),
      ...(data.category && { category: data.category as any }),
      ...(data.fileUrl && { fileUrl: data.fileUrl }),
      ...(data.fileName && { fileName: data.fileName }),
      ...(data.fileType && { fileType: data.fileType }),
      ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
      ...(data.tags && { tags: data.tags }),
      ...(data.summary && { summary: data.summary }),
      ...(data.expiresAt !== undefined && {
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      }),
      ...(data.status && { status: data.status as any }),
    },
  });
}

export async function deleteDocument(userId: string, id: string) {
  const existing = await prisma.document.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Document not found", 404);
  await prisma.document.delete({ where: { id } });
}

export async function getDocumentsDashboard(userId: string, filters?: {
  q?: string;
  category?: string;
}) {
  const where: any = { userId };

  if (filters?.category) {
    where.category = filters.category;
  }

  if (filters?.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { summary: { contains: filters.q, mode: "insensitive" } },
      { tags: { has: filters.q } },
    ];
  }

  const [folders, documents] = await Promise.all([
    prisma.documentFolder.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.document.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  const now = new Date();
  const expired = documents.filter((d) => d.expiresAt && d.expiresAt < now).length;
  const expiringSoon = documents.filter(
    (d) =>
      d.expiresAt &&
      d.expiresAt >= now &&
      d.expiresAt.getTime() - now.getTime() < 1000 * 60 * 60 * 24 * 30,
  ).length;

  const stats = {
    totalDocuments: documents.length,
    activeDocuments: documents.filter((d) => d.status === "ACTIVE").length,
    archivedDocuments: documents.filter((d) => d.status === "ARCHIVED").length,
    expiredDocuments: expired,
    expiringSoon,
  };

  const insight =
    documents.length > 0
      ? "Your document vault reflects real stored documents and expiry metadata."
      : "No documents in your vault yet — add important files to see stats.";

  return {
    stats,
    folders,
    documents,
    insight,
  };
}