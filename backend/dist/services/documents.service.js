"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDocumentFile = uploadDocumentFile;
exports.createFolder = createFolder;
exports.updateFolder = updateFolder;
exports.deleteFolder = deleteFolder;
exports.createDocument = createDocument;
exports.updateDocument = updateDocument;
exports.deleteDocument = deleteDocument;
exports.getDocumentsDashboard = getDocumentsDashboard;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const cloudinary_1 = require("../config/cloudinary");
async function uploadDocumentFile(buffer, originalName, mimeType) {
    const isImage = mimeType.startsWith("image/");
    const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader.upload_stream({
            folder: "lifeos/documents",
            resource_type: isImage ? "image" : "raw",
        }, (err, result) => (err || !result ? reject(err) : resolve(result)));
        stream.end(buffer);
    });
    return {
        fileUrl: uploaded.secure_url,
        fileName: originalName,
        fileType: mimeType,
        fileSize: uploaded.bytes,
    };
}
async function createFolder(userId, data) {
    return prisma_1.prisma.documentFolder.create({
        data: {
            userId,
            name: data.name,
            description: data.description,
        },
    });
}
async function updateFolder(userId, id, data) {
    const existing = await prisma_1.prisma.documentFolder.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Folder not found", 404);
    return prisma_1.prisma.documentFolder.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.description && { description: data.description }),
        },
    });
}
async function deleteFolder(userId, id) {
    const existing = await prisma_1.prisma.documentFolder.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Folder not found", 404);
    const docsCount = await prisma_1.prisma.document.count({ where: { folderId: id, userId } });
    if (docsCount > 0) {
        throw new errors_1.AppError("Cannot delete folder with documents", 400);
    }
    await prisma_1.prisma.documentFolder.delete({ where: { id } });
}
async function createDocument(userId, data) {
    return prisma_1.prisma.document.create({
        data: {
            userId,
            folderId: data.folderId,
            title: data.title,
            category: data.category,
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
async function updateDocument(userId, id, data) {
    const existing = await prisma_1.prisma.document.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Document not found", 404);
    return prisma_1.prisma.document.update({
        where: { id },
        data: {
            ...(data.folderId && { folderId: data.folderId }),
            ...(data.title && { title: data.title }),
            ...(data.category && { category: data.category }),
            ...(data.fileUrl && { fileUrl: data.fileUrl }),
            ...(data.fileName && { fileName: data.fileName }),
            ...(data.fileType && { fileType: data.fileType }),
            ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
            ...(data.tags && { tags: data.tags }),
            ...(data.summary && { summary: data.summary }),
            ...(data.expiresAt !== undefined && {
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            }),
            ...(data.status && { status: data.status }),
        },
    });
}
async function deleteDocument(userId, id) {
    const existing = await prisma_1.prisma.document.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Document not found", 404);
    await prisma_1.prisma.document.delete({ where: { id } });
}
async function getDocumentsDashboard(userId, filters) {
    const where = { userId };
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
        prisma_1.prisma.documentFolder.findMany({ where: { userId }, orderBy: { name: "asc" } }),
        prisma_1.prisma.document.findMany({
            where,
            orderBy: [{ createdAt: "desc" }],
        }),
    ]);
    const now = new Date();
    const expired = documents.filter((d) => d.expiresAt && d.expiresAt < now).length;
    const expiringSoon = documents.filter((d) => d.expiresAt &&
        d.expiresAt >= now &&
        d.expiresAt.getTime() - now.getTime() < 1000 * 60 * 60 * 24 * 30).length;
    const stats = {
        totalDocuments: documents.length,
        activeDocuments: documents.filter((d) => d.status === "ACTIVE").length,
        archivedDocuments: documents.filter((d) => d.status === "ARCHIVED").length,
        expiredDocuments: expired,
        expiringSoon,
    };
    const insight = documents.length > 0
        ? "Your document vault reflects real stored documents and expiry metadata."
        : "No documents in your vault yet — add important files to see stats.";
    return {
        stats,
        folders,
        documents,
        insight,
    };
}
