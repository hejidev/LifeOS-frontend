import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as staffService from "../services/staff.service";

export const listStaff = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const staff = await staffService.listStaff(req.user!.id);
  return res.json({ staff });
});

export const createStaff = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const staff = await staffService.createStaff(req.user!.id, req.body);
  return res.status(201).json({ staff });
});

export const updateStaff = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const staff = await staffService.updateStaff(req.user!.id, req.params.id, req.body);
  return res.json({ staff });
});

export const deleteStaff = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await staffService.deleteStaff(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const clockIn = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const staff = await staffService.clockIn(req.user!.id, req.body.staffId, req.body.pin);
  return res.json({ staff });
});

export const logActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const activity = await staffService.logActivity(req.user!.id, req.params.id, req.body);
  return res.status(201).json({ activity });
});

export const getActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const staffId = req.query.staffId as string | undefined;
  const activity = await staffService.getStaffActivity(req.user!.id, staffId);
  return res.json({ activity });
});