import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { requireRole } from "../middlewares/roles.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createContentSchema, updateContentSchema, reviewContentSchema } from "../validators/cms.validator";
import * as cmsController from "../controllers/cms.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();

router.get("/public/blog/:slug", cmsController.getPublishedBySlug);
router.get("/public/:type", cmsController.getPublished);

router.use(requireAuth);

router.get("/mine", requirePermission("MANAGE_CONTENT"), cmsController.listMine);
router.get("/all", requireRole("SUPER_ADMIN"), cmsController.listAll);
router.post("/upload-image", requirePermission("MANAGE_CONTENT"), upload.single("file"), cmsController.uploadImage);
router.post("/", requirePermission("MANAGE_CONTENT"), validate(createContentSchema), cmsController.create);
router.patch("/:id", requirePermission("MANAGE_CONTENT"), validate(updateContentSchema), cmsController.update);
router.post("/:id/submit-review", requirePermission("MANAGE_CONTENT"), cmsController.submitForReview);
router.post("/:id/publish", requirePermission("MANAGE_CONTENT"), cmsController.publishDirectly);
router.post("/:id/review", requireRole("SUPER_ADMIN"), validate(reviewContentSchema), cmsController.review);
router.delete("/:id", requirePermission("MANAGE_CONTENT"), cmsController.remove);

export default router;