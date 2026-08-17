import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";
import { checkAndConsumeUsage } from "../services/billing.service";

export function requireUsageOrSubscription(tool: "AI_WRITING" | "AI_IMAGE" | "FILE_CONVERTER") {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      await checkAndConsumeUsage(req.user!.id, tool);
      next();
    } catch (err) {
      next(err);
    }
  };
}