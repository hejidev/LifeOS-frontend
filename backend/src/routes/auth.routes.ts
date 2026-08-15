import { Router } from "express";
import { validate } from "../middlewares/validate.middleware";
import { registerSchema, loginSchema, forgotPasswordSchema, requestLoginCodeSchema, resetPasswordSchema, verifyLoginCodeSchema } from "../validators/auth.validator";
import { loginRateLimiter, registerRateLimiter, twoFactorRateLimiter } from "../middlewares/rateLimiter.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import * as authController from "../controllers/auth.controller";

const router = Router();

router.post("/auth/register", registerRateLimiter, validate(registerSchema), authController.register);
router.post("/auth/login", loginRateLimiter, validate(loginSchema), authController.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/verify-2fa", twoFactorRateLimiter, authController.verifyTwoFactor);
router.post("/auth/request-login-code", loginRateLimiter, validate(requestLoginCodeSchema), authController.requestLoginCode);
router.post("/auth/verify-login-code", loginRateLimiter, validate(verifyLoginCodeSchema), authController.verifyLoginCode);
router.post("/auth/forgot-password", loginRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/auth/reset-password", validate(resetPasswordSchema), authController.resetPassword);
router.post("/auth/logout", authController.logout);
router.get("/auth/me", requireAuth, authController.me);

export default router;
