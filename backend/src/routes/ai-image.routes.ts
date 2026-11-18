import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { requireUsageOrSubscription } from "../middlewares/usage.middleware";
import { rateLimitUser } from "../lib/rate-limit";
import { applyToolSchema, convertFormatSchema, generativeEditSchema } from "../validators/ai-image.validator";
import * as aiImageController from "../controllers/ai-image.controller";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => (ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error("Use a PNG, JPG, WebP, GIF or AVIF image"))),
});

const router = Router();
router.use(requireAuth);

const guard = rateLimitUser("image-tools", 20, 60, "You're editing too quickly.");

router.post("/image-tools/upload", rateLimitUser("image-upload", 30, 3600, "You've uploaded a lot of images."), upload.single("file"), aiImageController.uploadImage);
router.post("/image-tools/apply", validate(applyToolSchema), guard, requireUsageOrSubscription("AI_IMAGE"), aiImageController.applyTool);
router.post("/image-tools/convert", validate(convertFormatSchema), guard, requireUsageOrSubscription("AI_IMAGE"), aiImageController.convertFormat);
router.post("/image-tools/generative", validate(generativeEditSchema), guard, requireUsageOrSubscription("AI_IMAGE"), aiImageController.generativeEdit);

export default router;