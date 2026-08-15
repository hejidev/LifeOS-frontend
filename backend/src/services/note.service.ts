import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

function serializeNote(note: any) {
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

export async function getNotes(userId: string) {
  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  return notes.map(serializeNote);
}

export async function getNoteById(userId: string, noteId: string) {
  const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!note) throw new AppError("Note not found", 404);
  return serializeNote(note);
}

export async function createNote(userId: string, data: any) {
  const note = await prisma.note.create({
    data: { ...data, userId, folder: data.folder as any },
  });
  return serializeNote(note);
}

export async function updateNote(userId: string, noteId: string, data: any) {
  const existing = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!existing) throw new AppError("Note not found", 404);

  const note = await prisma.note.update({
    where: { id: noteId },
    data: { ...data, ...(data.folder && { folder: data.folder as any }) },
  });
  return serializeNote(note);
}

export async function deleteNote(userId: string, noteId: string) {
  const existing = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!existing) throw new AppError("Note not found", 404);
  await prisma.note.delete({ where: { id: noteId } });
}

export async function convertNoteToTask(userId: string, noteId: string) {
  const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!note) throw new AppError("Note not found", 404);

  const task = await prisma.task.create({
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

  await prisma.note.update({
    where: { id: noteId },
    data: { linkedTaskIds: { push: task.id } },
  });

  return task;
}