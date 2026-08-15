import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/token.service";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string | null;
  };
}

export async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next(new AppError("Not authenticated", 401));
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return next(new AppError("User not found", 401));
    if (!user.isActive) return next(new AppError("Account disabled", 401));
    if (payload.sv !== user.sessionVersion) return next(new AppError("Session revoked, please log in again", 401));

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch {
    next(new AppError("Invalid or expired session", 401));
  }
}