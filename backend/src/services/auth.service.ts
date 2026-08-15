import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import { AppError } from "../lib/errors";
import { assertStrongPassword } from "../lib/password-policy";
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from "./token.service";
import { sendLoginCodeEmail, sendPasswordResetEmail } from "./email.service";
import { env } from "../config/env";
import { logger } from "../lib/logger";

const SALT_ROUNDS = 12;
const DUMMY_HASH = "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinval";
const RESET_TTL_SECONDS = 60 * 15; // 15 minutes
const LOGIN_CODE_TTL_SECONDS = 60 * 10;
const LOGIN_CODE_RESEND_SECONDS = 60;
const LOGIN_CODE_MAX_ATTEMPTS = 5;

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const normaliseEmail = (email: string) => email.trim().toLowerCase();

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  assertStrongPassword(input.password);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError("Email already in use", 409);

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash, role: "USER", provider: "CREDENTIALS" },
  });

  return sanitizeUser(user);
}

export async function authenticateUser(email: string, password: string, meta: { ip?: string; userAgent?: string } = {}) {
  const user = await prisma.user.findUnique({ where: { email } });
  const isValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  await prisma.loginAttempt.create({
    data: { email, success: !!user?.passwordHash && isValid, ipAddress: meta.ip, userAgent: meta.userAgent },
  });

  if (!user || !user.passwordHash || !isValid) {
    throw new AppError("Invalid email or password", 401);
  }
  if (!user.isActive) {
    throw new AppError("Account disabled, contact support", 403);
  }

  return sanitizeUser(user);
}

export async function issueSession(userId: string, role: string, sessionVersion: number) {
  const accessToken = signAccessToken({ sub: userId, role, sv: sessionVersion });
  const { raw: refreshToken } = await issueRefreshToken(userId, sessionVersion);
  return { accessToken, refreshToken };
}

export async function refreshSession(refreshToken: string) {
  const result = await rotateRefreshToken(refreshToken);
  if (!result || result === "REUSE_DETECTED") {
    throw new AppError("Session expired, please log in again", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: result.userId } });
  if (!user || !user.isActive || result.sessionVersion !== user.sessionVersion) {
    throw new AppError("Session expired, please log in again", 401);
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, sv: user.sessionVersion });
  return { accessToken, refreshToken: result.raw, user: sanitizeUser(user) };
}

export async function endSession(refreshToken: string) {
  await revokeRefreshToken(refreshToken);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return;

  const token = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  await redis.set(`reset:${hashed}`, user.id, "EX", RESET_TTL_SECONDS);

  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  if (env.NODE_ENV === "development") {
    logger.info(`[dev] reset link for ${email} → ${resetLink}`);
  }

  await sendPasswordResetEmail(email, resetLink);
}

export async function resetPassword(token: string, newPassword: string) {
  assertStrongPassword(newPassword);
  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const userId = await redis.get(`reset:${hashed}`);

  if (!userId) throw new AppError("Reset link is invalid or has expired", 400);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  await redis.del(`reset:${hashed}`);
}

export async function requestEmailLoginCode(emailInput: string) {
  const email = normaliseEmail(emailInput);
  const cooldownKey = `login-code:cooldown:${sha256(email)}`;
  if (await redis.get(cooldownKey)) {
    throw new AppError("Please wait before requesting another code.", 429);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Do not disclose whether this email is registered.
  if (!user || !user.isActive) {
    return { message: "If an eligible account exists, a code has been sent." };
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const challengeId = crypto.randomUUID();
  await Promise.all([
    redis.set(
      `login-code:${challengeId}`,
      JSON.stringify({ userId: user.id, codeHash: sha256(code), attempts: 0 }),
      "EX",
      LOGIN_CODE_TTL_SECONDS
    ),
    redis.set(cooldownKey, "1", "EX", LOGIN_CODE_RESEND_SECONDS),
  ]);
  await sendLoginCodeEmail(user.email, code);
  return { message: "If an eligible account exists, a code has been sent.", challengeId };
}

export async function verifyEmailLoginCode(challengeId: string, code: string) {
  const key = `login-code:${challengeId}`;
  const stored = await redis.get(key);
  if (!stored) throw new AppError("This code has expired. Request a new one.", 401);

  const challenge = JSON.parse(stored) as { userId: string; codeHash: string; attempts: number };
  if (challenge.attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
    await redis.del(key);
    throw new AppError("Too many incorrect attempts. Request a new code.", 429);
  }
  if (sha256(code) !== challenge.codeHash) {
    challenge.attempts += 1;
    await redis.set(key, JSON.stringify(challenge), "KEEPTTL");
    throw new AppError("Incorrect code.", 401);
  }
  await redis.del(key);
  const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user || !user.isActive) throw new AppError("Account unavailable.", 401);
  return user;
}

export function sanitizeUser(user: {
  id: string; email: string; name: string | null; role: string; avatarUrl: string | null; sessionVersion: number;
}) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, sessionVersion: user.sessionVersion };
}
