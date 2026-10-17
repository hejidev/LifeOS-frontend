import type { Response, NextFunction, Request } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

export interface StaffRequest extends Request {
  staff?: { staffId: string; bizProfileId: string; storeId: string; role: string };
}

function extractToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.lifeos_staff_token;
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);

  return undefined;
}

export async function requireStaffSession(req: StaffRequest, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      console.error("[staff-session] no token (cookie or bearer) on", req.method, req.path);
      return next(new AppError("Not logged in as staff", 401));
    }

    const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as any;
    if (payload.type !== "staff") {
      console.error("[staff-session] token type mismatch:", payload.type);
      return next(new AppError("Invalid staff session", 401));
    }

    if (!payload.storeId) {
      console.error("[staff-session] token predates multi-location support — no storeId");
      return next(new AppError("Please log in again", 401));
    }

    const profile = await prisma.bizProfile.findUnique({ where: { id: payload.bizProfileId } });
    if (!profile) {
      console.error("[staff-session] no bizProfile found for id", payload.bizProfileId);
      return next(new AppError("Staff session expired, please log in again", 401));
    }
    if (profile.staffTokenVersion !== payload.tokenVersion) {
      console.error("[staff-session] token version mismatch — token has", payload.tokenVersion, "db has", profile.staffTokenVersion);
      return next(new AppError("Staff session expired, please log in again", 401));
    }

    req.staff = { staffId: payload.staffId, bizProfileId: payload.bizProfileId, storeId: payload.storeId, role: payload.role };
    next();
  } catch (err) {
    console.error("[staff-session] verify error:", err);
    next(new AppError("Invalid staff session", 401));
  }
}