import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { applyToolSchema, convertFormatSchema, generativeEditSchema } from "../validators/ai-image.validator";
import { requireUsageOrSubscription } from "../middlewares/usage.middleware";
import * as aiImageController from "../controllers/ai-image.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only image files allowed")),
});

const router = Router();
router.use(requireAuth);

router.post("/image-tools/upload", upload.single("file"), aiImageController.uploadImage);
router.post("/image-tools/apply", requireUsageOrSubscription("AI_IMAGE"), validate(applyToolSchema), aiImageController.applyTool);
router.post("/image-tools/convert", requireUsageOrSubscription("AI_IMAGE"), validate(convertFormatSchema), aiImageController.convertFormat);
router.post("/image-tools/generative", requireUsageOrSubscription("AI_IMAGE"), validate(generativeEditSchema), aiImageController.generativeEdit);

export default router;