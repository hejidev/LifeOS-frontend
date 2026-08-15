// src/routes/two-factor.routes.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { disableTwoFactorSchema, verifyCodeSchema } from "../validators/two-factor.validator";
import { twoFactorRateLimiter } from "../middlewares/rateLimiter.middleware";
import * as twoFactorController from "../controllers/two-factor.controller";

const router = Router();
router.use(requireAuth);

router.post("/setup", twoFactorController.setup);
router.post("/enable", twoFactorRateLimiter, validate(verifyCodeSchema), twoFactorController.enable);
router.post("/disable", twoFactorRateLimiter, validate(disableTwoFactorSchema), twoFactorController.disable);
router.get("/status", twoFactorController.status);

export default router;
