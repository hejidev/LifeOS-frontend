import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as analyticsService from "../services/analytics.service";

export const getAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { range, from, to, storeId } = req.query as { range?: string; from?: string; to?: string; storeId?: string };
  const data = await analyticsService.getAnalytics(req.user!.id, { range, from, to }, storeId);
  return res.json(data);
});