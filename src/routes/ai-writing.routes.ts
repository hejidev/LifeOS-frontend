import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { streamWritingSchema, saveDocumentSchema } from "../validators/ai-writing.validator";
import * as aiWritingController from "../controllers/ai-writing.controller";
import { requireUsageOrSubscription } from "../middlewares/usage.middleware";

const router = Router();
router.use(requireAuth);

router.post(
    "/ai/writing/stream",
    requireUsageOrSubscription("AI_WRITING"),
    validate(streamWritingSchema),
    aiWritingController.streamWritingHandler
  );
router.post("/ai/writing/documents", validate(saveDocumentSchema), aiWritingController.saveDocument);
router.get("/ai/writing/documents", aiWritingController.getDocuments);
router.delete("/ai/writing/documents/:id", aiWritingController.deleteDocument);
router.post("/ai/writing/documents/:id/convert-to-note", aiWritingController.convertToNote);

export default router;