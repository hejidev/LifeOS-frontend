import type { Response } from "express";
import { asyncHandler, AppError } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as userService from "../services/user.service";

export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await userService.getProfile(req.user!.id);
  return res.status(200).json({ user: profile });
});

export const updateMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const profile = await userService.updateProfile(req.user!.id, req.body);
  return res.status(200).json({ user: profile });
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await userService.changePassword(req.user!.id, currentPassword, newPassword);
  return res.status(204).send();
});

export const uploadAvatar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError("No file uploaded", 400);
  const profile = await userService.uploadAvatar(req.user!.id, file.buffer);
  return res.status(200).json({ user: profile });
});