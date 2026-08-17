import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/roles.middleware";
import { validate } from "../middlewares/validate.middleware";
import { loginRateLimiter } from "../middlewares/rateLimiter.middleware";
import { createContactSubmissionSchema, updateSubmissionStatusSchema } from "../validators/contact-submission.validator";
import * as contactSubmissionController from "../controllers/contact-submission.controller";

const router = Router();

router.post("/", loginRateLimiter, validate(createContactSubmissionSchema), contactSubmissionController.create);

router.use(requireAuth);
router.use(requireRole("ADMIN", "SUPER_ADMIN"));
router.get("/", contactSubmissionController.list);
router.patch("/:id/status", validate(updateSubmissionStatusSchema), contactSubmissionController.updateStatus);

export default router;