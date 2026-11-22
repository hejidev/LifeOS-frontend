import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as goalService from "../services/goal.service";

export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json({ goals: await goalService.listGoals(req.user!.id) })
);

export const create = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.status(201).json({ goal: await goalService.createGoal(req.user!.id, req.body) })
);

export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  res.json({ goal: await goalService.updateGoal(req.user!.id, req.params.id, req.body) })
);

export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await goalService.deleteGoal(req.user!.id, req.params.id);
  return res.status(204).send();
});