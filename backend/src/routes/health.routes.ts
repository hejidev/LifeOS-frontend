import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { logHealthSchema } from "../validators/health.validator";
import * as healthController from "../controllers/health.controller";

const router = Router();

router.get("/health/summary", requireAuth, healthController.getHealthSummary);
router.post("/health/log", requireAuth, validate(logHealthSchema), healthController.logHealth);

export default router;