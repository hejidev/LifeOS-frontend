"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotes = getNotes;
exports.getNoteById = getNoteById;
exports.createNote = createNote;
exports.updateNote = updateNote;
exports.deleteNote = deleteNote;
exports.convertNoteToTask = convertNoteToTask;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
function serializeNote(note) {
    return {
        id: note.id,
        title: note.title,
        content: note.content,
        summary: note.summary,
        folder: note.folder,
        tags: note.tags,
        linkedTaskIds: note.linkedTaskIds,
        pinned: note.pinned,
        attachments: [],
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
    };
}
async function getNotes(userId) {
    const notes = await prisma_1.prisma.note.findMany({
        where: { userId },
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
    return notes.map(serializeNote);
}
async function getNoteById(userId, noteId) {
    const note = await prisma_1.prisma.note.findFirst({ where: { id: noteId, userId } });
    if (!note)
        throw new errors_1.AppError("Note not found", 404);
    return serializeNote(note);
}
async function createNote(userId, data) {
    const note = await prisma_1.prisma.note.create({
        data: { ...data, userId, folder: data.folder },
    });
    return serializeNote(note);
}
async function updateNote(userId, noteId, data) {
    const existing = await prisma_1.prisma.note.findFirst({ where: { id: noteId, userId } });
    if (!existing)
        throw new errors_1.AppError("Note not found", 404);
    const note = await prisma_1.prisma.note.update({
        where: { id: noteId },
        data: { ...data, ...(data.folder && { folder: data.folder }) },
    });
    return serializeNote(note);
}
async function deleteNote(userId, noteId) {
    const existing = await prisma_1.prisma.note.findFirst({ where: { id: noteId, userId } });
    if (!existing)
        throw new errors_1.AppError("Note not found", 404);
    await prisma_1.prisma.note.delete({ where: { id: noteId } });
}
async function convertNoteToTask(userId, noteId) {
    const note = await prisma_1.prisma.note.findFirst({ where: { id: noteId, userId } });
    if (!note)
        throw new errors_1.AppError("Note not found", 404);
    const task = await prisma_1.prisma.task.create({
        data: {
            userId,
            title: note.title,
            description: `Created from note: ${note.title}`,
            priority: "P3",
            tags: [...note.tags, "from-note"],
            linkedNoteId: noteId,
            subtasks: {},
        },
        include: { subtasks: true },
    });
    await prisma_1.prisma.note.update({
        where: { id: noteId },
        data: { linkedTaskIds: { push: task.id } },
    });
    return task;
}
