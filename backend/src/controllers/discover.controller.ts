import type { Response } from "express";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as discover from "../services/discover.service";

export const search = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  return res.json({ results: await discover.searchEverything(req.user!.id, String(req.query.q ?? "")) });
});

export const setup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await discover.getSetupStatus(req.user!.id)));