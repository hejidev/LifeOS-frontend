import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createGoalSchema, updateGoalSchema, createSkillSchema, updateSkillSchema, createAchievementSchema } from "../validators/career.validator";
import * as careerController from "../controllers/career.controller";

const router = Router();
router.use(requireAuth);

router.get("/career/dashboard", careerController.getDashboard);
router.post("/career/goals", validate(createGoalSchema), careerController.createGoal);
router.patch("/career/goals/:id", validate(updateGoalSchema), careerController.updateGoal);
router.delete("/career/goals/:id", careerController.deleteGoal);
router.post("/career/skills", validate(createSkillSchema), careerController.createSkill);
router.patch("/career/skills/:id", validate(updateSkillSchema), careerController.updateSkill);
router.delete("/career/skills/:id", careerController.deleteSkill);
router.post("/career/achievements", validate(createAchievementSchema), careerController.createAchievement);
router.delete("/career/achievements/:id", careerController.deleteAchievement);

export default router;