import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/token.service";
import { loadAuthUser } from "../lib/auth-cache";
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
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("Not authenticated", 401));
  }

  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(authHeader.substring(7));
  } catch {
    return next(new AppError("Invalid or expired session", 401));
  }

  try {
    const user = await loadAuthUser(payload.sub);
    if (!user) return next(new AppError("User not found", 401));
    if (!user.isActive) return next(new AppError("Account disabled", 401));
    if (payload.sv !== user.sessionVersion) return next(new AppError("Session revoked, please log in again", 401));

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
}