import type { Request, Response } from "express";
import { asyncHandler, AppError } from "../lib/errors";
import { env } from "../config/env";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import * as twoFactorService from "../services/two-factor.service";
import * as authService from "../services/auth.service";

const isProd = env.NODE_ENV !== "development";

const REFRESH_COOKIE = "lifeos_rt";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
const FLAG_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const isMobileClient = (req: Request) => req.headers["x-client"] === "mobile";

function readRefreshToken(req: Request): string | undefined {
  if (isMobileClient(req)) {
    return typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
  }
  return req.cookies?.[REFRESH_COOKIE];
}

function sendSession(
  req: Request,
  res: Response,
  session: { accessToken: string; refreshToken: string },
  user: { role: string }
) {
  if (isMobileClient(req)) {
    return res.status(200).json({ accessToken: session.accessToken, refreshToken: session.refreshToken, user });
  }
  res.cookie(REFRESH_COOKIE, session.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.cookie("lifeos_authed", "1", FLAG_COOKIE_OPTIONS);
  res.cookie("lifeos_role", user.role, FLAG_COOKIE_OPTIONS);
  return res.status(200).json({ accessToken: session.accessToken, user });
}

function createPendingTwoFactorToken(userId: string) {
  return jwt.sign({ sub: userId, purpose: "2fa_pending" }, env.ACCESS_TOKEN_SECRET, { expiresIn: 300 });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.registerUser(req.body);
  return res.status(201).json({ user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await authService.authenticateUser(email, password, {
    ip: req.ip,
    userAgent: req.headers["user-agent"] as string,
  });

  const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (fullUser?.twoFactorEnabled) {
    return res.status(200).json({ requires2FA: true, pendingToken: createPendingTwoFactorToken(user.id) });
  }

  const session = await authService.issueSession(user.id, user.email, user.name, user.role, user.sessionVersion);
  return sendSession(req, res, session, user);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = readRefreshToken(req);
  if (!token) throw new AppError("Not authenticated", 401);

  const { accessToken, refreshToken, user } = await authService.refreshSession(token);
  return sendSession(req, res, { accessToken, refreshToken }, user);
});

export const verifyTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const { pendingToken, code } = req.body;

  let payload: any;
  try {
    payload = jwt.verify(pendingToken, env.ACCESS_TOKEN_SECRET);
  } catch {
    throw new AppError("This code has expired, please log in again", 401);
  }
  if (payload.purpose !== "2fa_pending") throw new AppError("Invalid request", 400);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.twoFactorSecret) throw new AppError("Invalid request", 400);

  const valid = await twoFactorService.verifyCode(user.twoFactorSecret, code);
  if (!valid) throw new AppError("Incorrect code", 401);

  const session = await authService.issueSession(user.id, user.email, user.name, user.role, user.sessionVersion);
  return sendSession(req, res, session, authService.sanitizeUser(user));
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  return res.status(200).json({ message: "If that email is registered, a reset link has been sent." });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  return res.status(200).json({ message: "Password updated successfully." });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = readRefreshToken(req);
  if (token) await authService.endSession(token);
  if (!isMobileClient(req)) {
    res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS);
    res.clearCookie("lifeos_authed", FLAG_COOKIE_OPTIONS);
    res.clearCookie("lifeos_role", FLAG_COOKIE_OPTIONS);
  }
  return res.status(204).send();
});

export const me = asyncHandler(async (req: any, res: Response) => {
  return res.status(200).json({ user: req.user });
});

export const requestLoginCode = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.requestEmailLoginCode(req.body.email);
  return res.status(200).json(result);
});

export const verifyLoginCode = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.verifyEmailLoginCode(req.body.challengeId, req.body.code);

  if (user.twoFactorEnabled) {
    return res.status(200).json({ requires2FA: true, pendingToken: createPendingTwoFactorToken(user.id) });
  }

  const session = await authService.issueSession(user.id, user.email, user.name, user.role, user.sessionVersion);
  return sendSession(req, res, session, authService.sanitizeUser(user));
});