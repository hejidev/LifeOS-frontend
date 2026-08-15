import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as securityService from "../services/security.service";

export const getOverview = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  return res.json(await securityService.getSecurityOverview());
});

export const getFlagged = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ flagged: await securityService.getFlaggedAccounts() });
});

export const getLoginAttempts = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ attempts: await securityService.getRecentLoginAttempts() });
});

export const forceLogout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await securityService.forceLogoutUser(req.params.id);
  return res.status(204).send();
});