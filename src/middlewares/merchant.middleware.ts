import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

export async function requireMerchant(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const profile = await prisma.bizProfile.findUnique({ where: { userId: req.user!.id } });

    if (!profile) throw new AppError("You need to apply as a merchant before accessing the business dashboard", 403);
    if (profile.status === "PENDING") throw new AppError("Your merchant application is still under review", 403);
    if (profile.status === "REJECTED") throw new AppError("Your merchant application was not approved", 403);
    if (profile.status === "SUSPENDED") throw new AppError("Your merchant account has been suspended", 403);
    if (profile.planStatus !== "ACTIVE") throw new AppError("Choose a merchant plan to activate your dashboard", 402);
    if (profile.paused) throw new AppError("Your store is currently paused. Reactivate it in Settings.", 403);

    next();
  } catch (err) {
    next(err);
  }
}