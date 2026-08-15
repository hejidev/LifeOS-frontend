import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { StaffRequest } from "../middlewares/staff-session.middleware";
import * as staffPortalService from "../services/staff-portal.service";

export const logActivity = asyncHandler(async (req: StaffRequest, res: Response) => {
  const { action, description } = req.body;
  const activity = await staffPortalService.logSelfActivity(req.staff!.staffId, req.staff!.bizProfileId, action, description);
  return res.status(201).json({ activity });
});

export const getActivity = asyncHandler(async (req: StaffRequest, res: Response) => {
  const activity = await staffPortalService.getSelfActivity(req.staff!.staffId);
  return res.json({ activity });
});

export const clockOut = asyncHandler(async (req: StaffRequest, res: Response) => {
  await staffPortalService.clockOut(req.staff!.staffId, req.staff!.bizProfileId);
  return res.status(204).send();
});

export const getTeam = asyncHandler(async (req: StaffRequest, res: Response) => {
  const team = await staffPortalService.getActiveTeammates(req.staff!.staffId, req.staff!.bizProfileId);
  return res.json({ team });
});