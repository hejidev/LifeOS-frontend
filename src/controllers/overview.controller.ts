// controllers/overview.controller.ts

import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as overviewService from "../services/overview.service";

export const getTodayOverview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await overviewService.getTodayOverview(req.user!.id);
  return res.json(data);
});