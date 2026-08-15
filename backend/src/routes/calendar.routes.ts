import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createEventSchema, updateEventSchema } from "../validators/calendar.validator";
import * as calendarController from "../controllers/calendar.controller";

const router = Router();
router.use(requireAuth);

router.get("/", calendarController.list);
router.post("/", validate(createEventSchema), calendarController.create);
router.patch("/:id", validate(updateEventSchema), calendarController.update);
router.delete("/:id", calendarController.remove);

export default router;