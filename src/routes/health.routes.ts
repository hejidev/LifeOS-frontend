import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { logHealthSchema, createHabitSchema } from "../validators/health.validator";
import * as healthController from "../controllers/health.controller";

const router = Router();

router.use(requireAuth);

router.get("/health/summary", healthController.getHealthSummary);
router.post("/health/log", validate(logHealthSchema), healthController.logHealth);
router.get("/health/habits", healthController.getHabits);
router.post("/health/habits", validate(createHabitSchema), healthController.createHabit);
router.post("/health/habits/:id/complete", healthController.completeHabit);

export default router;