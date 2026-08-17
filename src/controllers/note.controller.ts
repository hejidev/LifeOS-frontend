import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as noteService from "../services/note.service";

export const getNotes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const notes = await noteService.getNotes(req.user!.id);
  return res.json({ notes });
});

export const getNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const note = await noteService.getNoteById(req.user!.id, req.params.id);
  return res.json({ note });
});

export const createNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const note = await noteService.createNote(req.user!.id, req.body);
  return res.status(201).json({ note });
});

export const updateNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const note = await noteService.updateNote(req.user!.id, req.params.id, req.body);
  return res.json({ note });
});

export const deleteNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await noteService.deleteNote(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const convertToTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const task = await noteService.convertNoteToTask(req.user!.id, req.params.id);
  return res.status(201).json({ task });
});