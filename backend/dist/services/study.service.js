"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMaterialFile = uploadMaterialFile;
exports.streamMaterialFile = streamMaterialFile;
exports.createSubject = createSubject;
exports.updateSubject = updateSubject;
exports.getSubjects = getSubjects;
exports.createMaterial = createMaterial;
exports.updateMaterial = updateMaterial;
exports.getMaterials = getMaterials;
exports.deleteMaterial = deleteMaterial;
exports.createSession = createSession;
exports.endSession = endSession;
exports.getStudyDashboard = getStudyDashboard;
exports.deleteSubject = deleteSubject;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const private_files_1 = require("../lib/private-files");
const time_1 = require("../lib/time");
const user_clock_1 = require("../lib/user-clock");
const FOLDER = "lifeos/study-materials";
const STALE_SESSION_MINUTES = 240;
const MAX_SESSION_MINUTES = 480;
const MAX_SUBJECTS = 100;
const minutesBetween = (from, to) => Math.max(1, Math.round((to.getTime() - from.getTime()) / 60000));
function present(material) {
    const isPrivate = (0, private_files_1.isOwnPrivateUrl)(material.url, FOLDER);
    return { ...material, url: isPrivate ? null : material.url, hasFile: isPrivate, isPrivate };
}
async function assertOwned(userId, refs) {
    if (refs.subjectId && !(await prisma_1.prisma.studySubject.findFirst({ where: { id: refs.subjectId, userId }, select: { id: true } }))) {
        throw new errors_1.AppError("Subject not found", 404);
    }
    if (refs.materialId && !(await prisma_1.prisma.studyMaterial.findFirst({ where: { id: refs.materialId, userId }, select: { id: true } }))) {
        throw new errors_1.AppError("Material not found", 404);
    }
}
async function uploadMaterialFile(buffer, originalName, mimeType) {
    const uploaded = await (0, private_files_1.uploadPrivate)(buffer, FOLDER, mimeType);
    return { url: uploaded.secure_url, fileName: originalName, fileType: mimeType, fileSize: uploaded.bytes };
}
async function streamMaterialFile(userId, id, res) {
    const material = await prisma_1.prisma.studyMaterial.findFirst({ where: { id, userId }, select: { url: true, fileName: true, fileType: true } });
    if (!material || !(0, private_files_1.isOwnPrivateUrl)(material.url, FOLDER))
        throw new errors_1.AppError("File not found", 404);
    await (0, private_files_1.streamPrivate)(material.url, material, res);
}
async function createSubject(userId, data) {
    if ((await prisma_1.prisma.studySubject.count({ where: { userId } })) >= MAX_SUBJECTS)
        throw new errors_1.AppError(`You can have up to ${MAX_SUBJECTS} subjects`, 400);
    return prisma_1.prisma.studySubject.create({ data: { userId, name: data.name, color: data.color, description: data.description } });
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
            ...(data.description !== undefined && { description: data.description }),
        },
    });
}
async function getSubjects(userId) {
    return prisma_1.prisma.studySubject.findMany({ where: { userId }, orderBy: { name: "asc" } });
}
async function createMaterial(userId, data) {
    await assertOwned(userId, { subjectId: data.subjectId });
    const material = await prisma_1.prisma.studyMaterial.create({
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
    return present(material);
}
async function updateMaterial(userId, id, data) {
    const existing = await prisma_1.prisma.studyMaterial.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Material not found", 404);
    await assertOwned(userId, { subjectId: data.subjectId });
    const material = await prisma_1.prisma.studyMaterial.update({
        where: { id },
        data: {
            ...(data.subjectId !== undefined && { subjectId: data.subjectId }),
            ...(data.title && { title: data.title }),
            ...(data.type && { type: data.type }),
            ...(data.url !== undefined && { url: data.url }),
            ...(data.fileName && { fileName: data.fileName }),
            ...(data.fileType && { fileType: data.fileType }),
            ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
            ...(data.notes !== undefined && { notes: data.notes }),
            ...(data.status && { status: data.status }),
            ...(data.progress !== undefined && { progress: data.progress }),
            ...(data.status === "COMPLETED" && data.progress === undefined && { progress: 100 }),
            ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }),
        },
    });
    return present(material);
}
async function getMaterials(userId) {
    const materials = await prisma_1.prisma.studyMaterial.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
    return materials.map(present);
}
async function deleteMaterial(userId, id) {
    const existing = await prisma_1.prisma.studyMaterial.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Material not found", 404);
    await prisma_1.prisma.studyMaterial.delete({ where: { id } });
    if ((0, private_files_1.isOwnPrivateUrl)(existing.url, FOLDER))
        void (0, private_files_1.destroyPrivate)(existing.url);
}
async function createSession(userId, data) {
    await assertOwned(userId, { subjectId: data.subjectId, materialId: data.materialId });
    const open = await prisma_1.prisma.studySession.findMany({ where: { userId, endedAt: null } });
    for (const session of open) {
        const endedAt = new Date(Math.min(Date.now(), session.startedAt.getTime() + STALE_SESSION_MINUTES * 60000));
        await prisma_1.prisma.studySession.update({ where: { id: session.id }, data: { endedAt, minutes: minutesBetween(session.startedAt, endedAt) } });
    }
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
    if (existing.endedAt)
        return existing;
    const requested = data.endedAt ? new Date(data.endedAt) : new Date();
    const limit = existing.startedAt.getTime() + MAX_SESSION_MINUTES * 60000;
    const endedAt = new Date(Math.max(existing.startedAt.getTime(), Math.min(requested.getTime(), limit)));
    return prisma_1.prisma.studySession.update({
        where: { id },
        data: { endedAt, minutes: minutesBetween(existing.startedAt, endedAt), notes: data.notes ?? existing.notes },
    });
}
const duration = (minutes) => (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`);
async function getStudyDashboard(userId, range = "month") {
    const clock = await (0, user_clock_1.getUserClock)(userId);
    const { zone, dateKey } = (0, time_1.dayBounds)(clock.zone);
    const weekday = ((0, time_1.dayNumber)(dateKey) + 4) % 7;
    const startKey = range === "today" ? dateKey : range === "week" ? (0, time_1.shiftDateKey)(dateKey, -((weekday - clock.weekStartsOn + 7) % 7)) : `${dateKey.slice(0, 8)}01`;
    const start = (0, time_1.startOfLocalDay)(startKey, zone);
    const streakFrom = (0, time_1.startOfLocalDay)((0, time_1.shiftDateKey)(dateKey, -60), zone);
    const [subjects, materials, recent, minutes, history, active] = await Promise.all([
        prisma_1.prisma.studySubject.findMany({ where: { userId }, orderBy: { name: "asc" } }),
        prisma_1.prisma.studyMaterial.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
        prisma_1.prisma.studySession.findMany({ where: { userId, startedAt: { gte: start } }, orderBy: { startedAt: "desc" }, take: 10 }),
        prisma_1.prisma.studySession.aggregate({ where: { userId, startedAt: { gte: start } }, _sum: { minutes: true } }),
        prisma_1.prisma.studySession.findMany({ where: { userId, endedAt: { not: null }, startedAt: { gte: streakFrom } }, select: { startedAt: true } }),
        prisma_1.prisma.studySession.findFirst({ where: { userId, endedAt: null }, orderBy: { startedAt: "desc" } }),
    ]);
    const studiedDays = new Set(history.map((session) => (0, time_1.localDateKey)(zone, session.startedAt)));
    let streakDays = 0;
    for (let cursor = studiedDays.has(dateKey) ? dateKey : (0, time_1.shiftDateKey)(dateKey, -1); studiedDays.has(cursor); cursor = (0, time_1.shiftDateKey)(cursor, -1))
        streakDays += 1;
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
    const parts = [];
    if (totalStudyMinutes > 0)
        parts.push(`You've studied ${duration(totalStudyMinutes)} ${label}.`);
    if (streakDays >= 2)
        parts.push(`${streakDays}-day study streak.`);
    if (overdueMaterials > 0)
        parts.push(`${overdueMaterials} ${overdueMaterials === 1 ? "material is" : "materials are"} past the target date.`);
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
async function deleteSubject(userId, id) {
    const existing = await prisma_1.prisma.studySubject.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Subject not found", 404);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.studyMaterial.updateMany({ where: { userId, subjectId: id }, data: { subjectId: null } }),
        prisma_1.prisma.studySession.updateMany({ where: { userId, subjectId: id }, data: { subjectId: null } }),
        prisma_1.prisma.studySubject.delete({ where: { id } }),
    ]);
}
