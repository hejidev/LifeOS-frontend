// src/controllers/two-factor.controller.ts
import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as twoFactorService from "../services/two-factor.service";

export const setup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await twoFactorService.generateSecret(req.user!.id);
  return res.json(result);
});

export const enable = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await twoFactorService.enableTwoFactor(req.user!.id, req.body.code);
  return res.status(204).send();
});

export const disable = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await twoFactorService.disableTwoFactor(req.user!.id, req.body.password, req.body.code);
  return res.status(204).send();
});

export const status = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  return res.json(await twoFactorService.getStatus(req.user!.id));
});
