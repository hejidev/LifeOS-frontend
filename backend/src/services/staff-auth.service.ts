import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import { env } from "../config/env";
import { createNotification } from "./notification.service";

const STAFF_TOKEN_TTL_SECONDS = 12 * 60 * 60;

export async function staffLogin(storeCode: string, staffName: string, pin: string) {
  const bizProfile = await prisma.bizProfile.findUnique({ where: { staffLoginCode: storeCode } });
  if (!bizProfile) throw new AppError("Invalid store code", 404);
  if (bizProfile.status !== "APPROVED" || bizProfile.planStatus !== "ACTIVE") {
    throw new AppError("This store isn't currently active", 403);
  }

  const staffList = await prisma.bizStaff.findMany({ where: { bizProfileId: bizProfile.id, status: "ACTIVE" } });
  const candidate = staffList.find((s) => s.name.toLowerCase() === staffName.toLowerCase());
  if (!candidate) throw new AppError("Incorrect name or PIN", 401);

  const valid = await bcrypt.compare(pin, candidate.pinHash);
  if (!valid) throw new AppError("Incorrect name or PIN", 401);

  const token = jwt.sign(
    { type: "staff", staffId: candidate.id, bizProfileId: bizProfile.id, role: candidate.role, tokenVersion: bizProfile.staffTokenVersion },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: STAFF_TOKEN_TTL_SECONDS }
  );

  const now = new Date();
  await prisma.bizStaff.update({ where: { id: candidate.id }, data: { lastActiveAt: now } });
  await prisma.bizStaffActivity.create({
    data: { staffId: candidate.id, bizProfileId: bizProfile.id, action: "LOGIN", description: `${candidate.name} logged in` },
  });

  await createNotification(bizProfile.userId, {
    type: "STAFF",
    title: "Staff clocked in",
    message: `${candidate.name} (${candidate.role.replace("_", " ").toLowerCase()}) clocked in at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    actionUrl: "/merchant/staff/activity",
  });

  return { token, staff: { id: candidate.id, name: candidate.name, role: candidate.role }, businessName: bizProfile.businessName };
}

export function verifyStaffToken(token: string) {
  const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as any;
  if (payload.type !== "staff") throw new AppError("Invalid staff session", 401);
  return payload as { staffId: string; bizProfileId: string; role: string };
}

export function generateStoreCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}