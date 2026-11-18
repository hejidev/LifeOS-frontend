import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as habitController from "../controllers/habit.controller";
import { createHabitSchema, toggleHabitSchema, updateHabitSchema } from "../validators/habit.validator";

const router = Router();

router.get("/health/habits/summary", requireAuth, habitController.getHabitSummary);
router.get("/health/habits", requireAuth, habitController.getHabits);
router.post("/health/habits", requireAuth, validate(createHabitSchema), habitController.createHabit);
router.patch("/health/habits/:id", requireAuth, validate(updateHabitSchema), habitController.updateHabit);
router.delete("/health/habits/:id", requireAuth, habitController.deleteHabit);
router.post("/health/habits/:id/complete", requireAuth, validate(toggleHabitSchema), habitController.toggleCompletion);

export default router;