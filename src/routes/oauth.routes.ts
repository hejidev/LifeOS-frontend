import { Router } from "express";
import { AppError, asyncHandler } from "../lib/errors";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import * as googleService from "../services/oauth/google.service";
import * as authService from "../services/auth.service";
import { sendWelcomeEmail } from "../services/email.service";

const REFRESH_COOKIE = "lifeos_rt";
const router = Router();

router.get("/auth/google", asyncHandler(async (_req, res) => {
  const url = await googleService.createGoogleAuthUrl();
  res.redirect(url);
}));

router.get("/auth/google/callback", asyncHandler(async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };

  const stateOk = await googleService.verifyGoogleState(state);
  if (!code || !stateOk) throw new AppError("Invalid OAuth state", 400);

  const googleUser = await googleService.exchangeCodeForGoogleUser(code);
  let user = await prisma.user.findUnique({ where: { email: googleUser.email } });
  let isNewUser = false;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        role: "USER",
        provider: "GOOGLE",
        providerId: googleUser.providerId,
        emailVerified: true,
      },
    });
    isNewUser = true;
  }

  const { accessToken, refreshToken } = await authService.issueSession(user.id, user.email, user.name, user.role, user.sessionVersion);

  if (isNewUser) await sendWelcomeEmail(user.email, user.name ?? "there");

  const isProd = env.NODE_ENV !== "development";

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.cookie("lifeos_authed", "1", {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.cookie("lifeos_role", user.role, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.redirect(`${env.FRONTEND_URL}/oauth/callback?accessToken=${accessToken}`);
}));

export default router;
