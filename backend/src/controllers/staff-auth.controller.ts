import type { Request, Response } from "express";
import { asyncHandler } from "../lib/errors";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import * as staffAuthService from "../services/staff-auth.service";
import type { StaffRequest } from "../middlewares/staff-session.middleware";

const STAFF_COOKIE = "lifeos_staff_token";
const STAFF_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api",
  maxAge: 12 * 60 * 60 * 1000,
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { storeCode, name, pin } = req.body;
  const result = await staffAuthService.staffLogin(storeCode, name, pin);
  res.cookie(STAFF_COOKIE, result.token, STAFF_COOKIE_OPTIONS);
  return res.json({ staff: result.staff, businessName: result.businessName });
});

export const me = asyncHandler(async (req: StaffRequest, res: Response) => {
  const staff = await prisma.bizStaff.findUnique({ where: { id: req.staff!.staffId } });
  if (!staff) return res.status(404).json({ error: "Staff not found" });

  const profile = await prisma.bizProfile.findUnique({
    where: { id: req.staff!.bizProfileId },
    select: { businessName: true, currency: true },
  });

  const { pinHash: _hash, ...rest } = staff;
  return res.json({
    staff: rest,
    businessName: profile?.businessName,
    currency: profile?.currency ?? "USD",
  });
});

export const logout = asyncHandler(async (_req: StaffRequest, res: Response) => {
  res.clearCookie(STAFF_COOKIE, { path: "/api" });
  return res.status(204).send();
});