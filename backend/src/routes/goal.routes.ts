import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createGoalSchema, updateGoalSchema } from "../validators/goal.validator";
import * as goalController from "../controllers/goal.controller";

const router = Router();
router.use(requireAuth);

router.get("/", goalController.list);
router.post("/", validate(createGoalSchema), goalController.create);
router.patch("/:id", validate(updateGoalSchema), goalController.update);
router.delete("/:id", goalController.remove);

export default router;