"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMaterialFile = uploadMaterialFile;
exports.createSubject = createSubject;
exports.updateSubject = updateSubject;
exports.getSubjects = getSubjects;
exports.createMaterial = createMaterial;
exports.updateMaterial = updateMaterial;
exports.getMaterials = getMaterials;
exports.createSession = createSession;
exports.endSession = endSession;
exports.getStudyDashboard = getStudyDashboard;
exports.deleteMaterial = deleteMaterial;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const cloudinary_1 = require("../config/cloudinary");
async function uploadMaterialFile(buffer, originalName, mimeType) {
    const isImage = mimeType.startsWith("image/");
    const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader.upload_stream({
            folder: "lifeos/study-materials",
            resource_type: isImage ? "image" : "raw",
        }, (err, result) => (err || !result ? reject(err) : resolve(result)));
        stream.end(buffer);
    });
    return {
        url: uploaded.secure_url,
        fileName: originalName,
        fileType: mimeType,
        fileSize: uploaded.bytes,
    };
}
async function createSubject(userId, data) {
    return prisma_1.prisma.studySubject.create({
        data: { userId, name: data.name, color: data.color, description: data.description },
    });
}
async function updateSubject(userId, id, data) {
    const existing = await prisma_1.prisma.studySubject.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Subject not found", 404);
    return prisma_1.prisma.studySubject.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.color && { color: data.color }),
            ...(data.description && { description: data.description }),
        },
    });
}
async function getSubjects(userId) {
    return prisma_1.prisma.studySubject.findMany({ where: { userId }, orderBy: { name: "asc" } });
}
async function createMaterial(userId, data) {
    return prisma_1.prisma.studyMaterial.create({
        data: {
            userId,
            subjectId: data.subjectId,
            title: data.title,
            type: data.type,
            url: data.url,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
            notes: data.notes,
            targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        },
    });
}
async function updateMaterial(userId, id, data) {
    const existing = await prisma_1.prisma.studyMaterial.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Material not found", 404);
    return prisma_1.prisma.studyMaterial.update({
        where: { id },
        data: {
            ...(data.subjectId && { subjectId: data.subjectId }),
            ...(data.title && { title: data.title }),
            ...(data.type && { type: data.type }),
            ...(data.url && { url: data.url }),
            ...(data.fileName && { fileName: data.fileName }),
            ...(data.fileType && { fileType: data.fileType }),
            ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
            ...(data.notes && { notes: data.notes }),
            ...(data.status && { status: data.status }),
            ...(data.progress !== undefined && { progress: data.progress }),
            ...(data.targetDate !== undefined && {
                targetDate: data.targetDate ? new Date(data.targetDate) : null,
            }),
        },
    });
}
async function getMaterials(userId) {
    return prisma_1.prisma.studyMaterial.findMany({
        where: { userId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
}
async function createSession(userId, data) {
    return prisma_1.prisma.studySession.create({
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
async function endSession(userId, id, data) {
    const existing = await prisma_1.prisma.studySession.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Session not found", 404);
    const endedAt = data.endedAt ? new Date(data.endedAt) : new Date();
    const minutes = Math.max(Math.round((endedAt.getTime() - existing.startedAt.getTime()) / 60000), 1);
    return prisma_1.prisma.studySession.update({
        where: { id },
        data: { endedAt, minutes, notes: data.notes ?? existing.notes },
    });
}
async function getStudyDashboard(userId, range = "month") {
    const now = new Date();
    let start;
    if (range === "today") {
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }
    else if (range === "week") {
        const day = now.getUTCDay();
        const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
    }
    else {
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }
    const [subjects, materials, sessions] = await Promise.all([
        prisma_1.prisma.studySubject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
        prisma_1.prisma.studyMaterial.findMany({
            where: { userId },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        }),
        prisma_1.prisma.studySession.findMany({
            where: { userId, startedAt: { gte: start } },
            orderBy: { startedAt: "desc" },
        }),
    ]);
    const subjectWithStatus = subjects.map((subject) => {
        const subjectMaterials = materials.filter((m) => m.subjectId === subject.id);
        if (subjectMaterials.length === 0) {
            return { ...subject, status: "PLANNED" }; // or null
        }
        const hasCompleted = subjectMaterials.some((m) => m.status === "COMPLETED");
        const hasInProgress = subjectMaterials.some((m) => m.status === "IN_PROGRESS");
        const hasOnHold = subjectMaterials.some((m) => m.status === "ON_HOLD");
        let status = "PLANNED";
        if (hasInProgress)
            status = "IN_PROGRESS";
        else if (hasCompleted && !hasInProgress)
            status = "COMPLETED";
        else if (hasOnHold && !hasInProgress && !hasCompleted)
            status = "ON_HOLD";
        return { ...subject, status };
    });
    const completedMaterials = materials.filter((m) => m.status === "COMPLETED").length;
    const inProgressMaterials = materials.filter((m) => m.status === "IN_PROGRESS").length;
    const totalStudyMinutes = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
    const insight = totalStudyMinutes > 0
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
async function deleteMaterial(userId, id) {
    const existing = await prisma_1.prisma.studyMaterial.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Material not found", 404);
    await prisma_1.prisma.studyMaterial.delete({ where: { id } });
}
