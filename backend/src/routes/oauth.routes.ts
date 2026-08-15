import { Router } from "express";
import { AppError, asyncHandler } from "../lib/errors";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import * as googleService from "../services/oauth/google.service";
import * as authService from "../services/auth.service";

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
  }

  const { accessToken, refreshToken } = await authService.issueSession(user.id, user.role, user.sessionVersion);

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  // Access token rides a one-time redirect; the frontend exchanges it
  // for session state immediately and the URL never gets bookmarked/shared.
  res.redirect(`${env.FRONTEND_URL}/oauth/callback?accessToken=${accessToken}`);
}));

export default router;
