import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

export function requirePermission(capability: string) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      if (req.user!.role === "SUPER_ADMIN") return next();
      if (req.user!.role !== "ADMIN") throw new AppError("Forbidden", 403);

      const has = await prisma.adminPermission.findUnique({
        where: { userId_capability: { userId: req.user!.id, capability: capability as any } },
      });
      if (!has) throw new AppError("You don't have permission to perform this action", 403);
      next();
    } catch (err) {
      next(err);
    }
  };
}