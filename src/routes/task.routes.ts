import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createTaskSchema, updateTaskSchema, updateSubtaskSchema } from "../validators/task.validator";
import * as taskController from "../controllers/task.controller";

const router = Router();

router.use(requireAuth);

router.get("/tasks", taskController.getTasks);
router.post("/tasks", validate(createTaskSchema), taskController.createTask);
router.get("/tasks/:id", taskController.getTask);
router.patch("/tasks/:id", validate(updateTaskSchema), taskController.updateTask);
router.delete("/tasks/:id", taskController.deleteTask);
router.patch("/tasks/:taskId/subtasks/:subtaskId", validate(updateSubtaskSchema), taskController.updateSubtask);
router.post("/tasks/:id/convert-to-note", taskController.convertToNote);

export default router;