import type { Response, NextFunction, Request } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

export interface StaffRequest extends Request {
  staff?: { staffId: string; bizProfileId: string; role: string };
}

export async function requireStaffSession(req: StaffRequest, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.lifeos_staff_token;
    if (!token) {
      console.error("[staff-session] no lifeos_staff_token cookie on", req.method, req.path);
      return next(new AppError("Not logged in as staff", 401));
    }

    const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as any;
    if (payload.type !== "staff") {
      console.error("[staff-session] token type mismatch:", payload.type);
      return next(new AppError("Invalid staff session", 401));
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

    req.staff = { staffId: payload.staffId, bizProfileId: payload.bizProfileId, role: payload.role };
    next();
  } catch (err) {
    console.error("[staff-session] verify error:", err);
    next(new AppError("Invalid staff session", 401));
  }
}