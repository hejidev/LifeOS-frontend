import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as careerService from "../services/career.service";

export const getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await careerService.getCareerDashboard(req.user!.id);
  return res.json(data);
});

export const createGoal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const goal = await careerService.createGoal(req.user!.id, req.body);
  return res.status(201).json({ goal });
});

export const updateGoal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const goal = await careerService.updateGoal(req.user!.id, req.params.id, req.body);
  return res.json({ goal });
});

export const deleteGoal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await careerService.deleteGoal(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const createSkill = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const skill = await careerService.createSkill(req.user!.id, req.body);
  return res.status(201).json({ skill });
});

export const updateSkill = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const skill = await careerService.updateSkill(req.user!.id, req.params.id, req.body);
  return res.json({ skill });
});

export const deleteSkill = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await careerService.deleteSkill(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const createAchievement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const achievement = await careerService.createAchievement(req.user!.id, req.body);
  return res.status(201).json({ achievement });
});

export const deleteAchievement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await careerService.deleteAchievement(req.user!.id, req.params.id);
  return res.status(204).send();
});