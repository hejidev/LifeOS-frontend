import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as healthService from "../services/health.service";

export const getHealthSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const summary = await healthService.getHealthSummary(req.user!.id);
  return res.json(summary);
});

export const logHealth = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const log = await healthService.logHealth(req.user!.id, req.body);
  return res.json({ log });
});

export const getHabits = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const habits = await healthService.getHabits(req.user!.id);
  return res.json({ habits });
});

export const createHabit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const habit = await healthService.createHabit(req.user!.id, req.body);
  return res.status(201).json({ habit });
});

export const completeHabit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await healthService.completeHabit(req.user!.id, req.params.id);
  return res.json(result);
});