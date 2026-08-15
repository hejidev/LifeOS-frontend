import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as habitController from "../controllers/habit.controller";
import { createHabitSchema, updateHabitSchema } from "../validators/habit.validator";

const router = Router();
router.use(requireAuth);

router.get("/health/habits/summary", habitController.getHabitSummary);
router.get("/health/habits", habitController.getHabits);
router.post("/health/habits", validate(createHabitSchema), habitController.createHabit);
router.patch("/health/habits/:id", validate(updateHabitSchema), habitController.updateHabit);
router.delete("/health/habits/:id", habitController.deleteHabit);
router.post("/health/habits/:id/complete", habitController.toggleCompletion);

export default router;