import { generateSecret as generateOtpSecret, generate, verify } from "otplib";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";

function buildOtpauthUri(email: string, secret: string) {
  const issuer = "LifeOS";
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export async function generateSecret(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const secret = generateOtpSecret();
  const otpauth = buildOtpauthUri(user.email, secret);

  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
  return { otpauth };
}

export async function enableTwoFactor(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) throw new AppError("Set up 2FA first", 400);

  const result = await verify({ secret: user.twoFactorSecret, token: code });
  if (!result.valid) throw new AppError("Invalid code", 401);

  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
}

export async function disableTwoFactor(userId: string, password: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    throw new AppError("Two-factor authentication is not enabled", 400);
  }
  if (!user.passwordHash) {
    throw new AppError("Password confirmation is unavailable for this account", 400);
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError("Current password is incorrect", 401);
  }
  if (!(await verifyCode(user.twoFactorSecret, code))) {
    throw new AppError("Invalid authentication code", 401);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, sessionVersion: { increment: 1 } },
  });
}

export async function verifyCode(secret: string, code: string) {
  const result = await verify({ secret, token: code });
  return result.valid;
}

export async function getStatus(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } });
  return { enabled: user?.twoFactorEnabled ?? false };
}
