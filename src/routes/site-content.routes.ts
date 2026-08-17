import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { teamMemberSchema, testimonialSchema } from "../validators/site-content.validator";
import * as siteContentController from "../controllers/site-content.controller";

const router = Router();

router.get("/team", siteContentController.getTeam);
router.get("/testimonials", siteContentController.getTestimonials);

router.use(requireAuth);
router.use(requirePermission("MANAGE_CONTENT"));

router.post("/team", validate(teamMemberSchema), siteContentController.createTeam);
router.patch("/team/:id", validate(teamMemberSchema), siteContentController.updateTeam);
router.delete("/team/:id", siteContentController.deleteTeam);
router.post("/testimonials", validate(testimonialSchema), siteContentController.createTestimonial);
router.patch("/testimonials/:id", validate(testimonialSchema), siteContentController.updateTestimonial);
router.delete("/testimonials/:id", siteContentController.deleteTestimonial);

export default router;