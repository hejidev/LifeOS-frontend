import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as habitService from "../services/habit.service";

export const getHabits = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const habits = await habitService.listHabits(req.user!.id, req.query.archived === "true");
  return res.json({ habits });
});

export const getHabitSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const summary = await habitService.getHabitSummary(req.user!.id);
  return res.json(summary);
});

export const createHabit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const habit = await habitService.createHabit(req.user!.id, req.body);
  return res.status(201).json({ habit });
});

export const updateHabit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const habit = await habitService.updateHabit(req.user!.id, req.params.id, req.body);
  return res.json({ habit });
});

export const deleteHabit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await habitService.deleteHabit(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const toggleCompletion = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const habit = await habitService.toggleCompletion(req.user!.id, req.params.id);
  return res.json({ habit });
});