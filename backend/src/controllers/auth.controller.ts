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

function setSessionCookies(res: Response, refreshToken: string, role: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.cookie("lifeos_authed", "1", FLAG_COOKIE_OPTIONS);
  res.cookie("lifeos_role", role, FLAG_COOKIE_OPTIONS);
}

function sendRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
}

function createPendingTwoFactorToken(userId: string) {
  return jwt.sign(
    { sub: userId, purpose: "2fa_pending" },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: 300 }
  );
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
    const pendingToken = jwt.sign({ sub: user.id, purpose: "2fa_pending" }, env.ACCESS_TOKEN_SECRET, { expiresIn: 300 });
    return res.status(200).json({ requires2FA: true, pendingToken });
  }

  const { accessToken, refreshToken } = await authService.issueSession(user.id, user.role, user.sessionVersion);
  setSessionCookies(res, refreshToken, user.role);

  return res.status(200).json({ accessToken, user });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AppError("Not authenticated", 401);

  const { accessToken, refreshToken, user } = await authService.refreshSession(token);
  setSessionCookies(res, refreshToken, user.role);

  return res.status(200).json({ accessToken, user });
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

  const { accessToken, refreshToken } = await authService.issueSession(user.id, user.role, user.sessionVersion);
  setSessionCookies(res, refreshToken, user.role);

  return res.status(200).json({ accessToken, user: authService.sanitizeUser(user) });
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
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await authService.endSession(token);
  res.clearCookie(REFRESH_COOKIE, { path: "/", secure: isProd, sameSite: isProd ? "none" : "lax" });
  res.clearCookie("lifeos_authed", { path: "/", secure: isProd, sameSite: isProd ? "none" : "lax" });
  res.clearCookie("lifeos_role", { path: "/", secure: isProd, sameSite: isProd ? "none" : "lax" });
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
    return res.status(200).json({
      requires2FA: true,
      pendingToken: createPendingTwoFactorToken(user.id),
    });
  }

  const { accessToken, refreshToken } = await authService.issueSession(
    user.id,
    user.role,
    user.sessionVersion
  );
  sendRefreshCookie(res, refreshToken);
  return res.status(200).json({ accessToken, user: authService.sanitizeUser(user) });
});
