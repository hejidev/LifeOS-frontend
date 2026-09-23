import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import type { StaffRequest } from "../middlewares/staff-session.middleware";
import * as staffShiftService from "../services/staff-shift.service";

export const listShifts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { from, to, staffId } = req.query as { from?: string; to?: string; staffId?: string };
  const shifts = await staffShiftService.listShifts(req.user!.id, { from, to, staffId });
  return res.json({ shifts });
});

export const createShift = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const shift = await staffShiftService.createShift(req.user!.id, req.body);
  return res.status(201).json({ shift });
});

export const updateShift = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const shift = await staffShiftService.updateShift(req.user!.id, req.params.id, req.body);
  return res.json({ shift });
});

export const deleteShift = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await staffShiftService.deleteShift(req.user!.id, req.params.id);
  return res.status(204).send();
});

export const getMyShifts = asyncHandler(async (req: StaffRequest, res: Response) => {
  const shifts = await staffShiftService.listMyShifts(req.staff!.staffId, req.staff!.bizProfileId);
  return res.json({ shifts });
});