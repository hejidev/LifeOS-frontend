import type { Response } from "express";
import { asyncHandler, AppError } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as taskService from "../services/task.service";

export const getTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tasks = await taskService.getTasks(req.user!.id);
  return res.json({ tasks });
});

export const getTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const task = await taskService.getTaskById(req.user!.id, req.params.id);
  return res.json({ task });
});

export const createTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const task = await taskService.createTask(req.user!.id, req.body);
  return res.status(201).json({ task });
});

export const updateTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const task = await taskService.updateTask(req.user!.id, req.params.id, req.body);
  return res.json({ task });
});

export const deleteTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await taskService.deleteTask(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const updateSubtask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const subtask = await taskService.updateSubtask(
    req.user!.id,
    req.params.taskId,
    req.params.subtaskId,
    req.body.completed
  );
  return res.json({ subtask });
});

export const convertToNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const note = await taskService.convertTaskToNote(req.user!.id, req.params.id);
  return res.status(201).json({ note });
});