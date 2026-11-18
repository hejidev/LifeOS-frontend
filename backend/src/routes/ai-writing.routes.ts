import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { requireUsageOrSubscription } from "../middlewares/usage.middleware";
import { rateLimitUser } from "../lib/rate-limit";
import { saveDocumentSchema, streamWritingSchema } from "../validators/ai-writing.validator";
import * as aiWritingController from "../controllers/ai-writing.controller";

const router = Router();
router.use(requireAuth);

router.post(
  "/ai/writing/stream",
  validate(streamWritingSchema),
  rateLimitUser("ai-writing", 10, 60, "You're generating too quickly."),
  requireUsageOrSubscription("AI_WRITING"),
  aiWritingController.streamWritingHandler
);
router.post("/ai/writing/documents", validate(saveDocumentSchema), aiWritingController.saveDocument);
router.get("/ai/writing/documents", aiWritingController.getDocuments);
router.delete("/ai/writing/documents/:id", aiWritingController.deleteDocument);
router.post("/ai/writing/documents/:id/convert-to-note", aiWritingController.convertToNote);

export default router;