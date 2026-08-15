import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as settingsService from "../services/settings.service";

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await settingsService.getProfile(req.user!.id);
  return res.json({ user: profile });
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await settingsService.updateProfile(req.user!.id, req.body);
  return res.json({ user: profile });
});

export const updatePreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await settingsService.updatePreferences(req.user!.id, req.body);
  return res.json({ user: profile });
});

export const updateNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await settingsService.updateNotifications(req.user!.id, req.body);
  return res.json({ user: profile });
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await settingsService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  return res.json({ success: true });
});

export const getAccountOverview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const overview = await settingsService.getAccountOverview(req.user!.id);
  return res.json(overview);
});

export const deactivateAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await settingsService.deactivateAccount(req.user!.id);
  return res.status(204).send();
});