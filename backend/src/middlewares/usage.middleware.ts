import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";
import { checkAndConsumeUsage, refundUsage } from "../services/billing.service";

type Tool = "AI_WRITING" | "AI_IMAGE" | "FILE_CONVERTER";

export function requireUsageOrSubscription(tool: Tool) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const charged = await checkAndConsumeUsage(userId, tool);

      if (charged) {
        res.once("close", () => {
          if (res.statusCode >= 400 || !res.headersSent) {
            void refundUsage(userId, tool).catch((err) => console.error("[usage] refund failed:", err));
          }
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}