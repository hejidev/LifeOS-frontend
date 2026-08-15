import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { chatMessageSchema } from "../validators/ai-assistant.validator";
import * as aiAssistantController from "../controllers/ai-assistant.controller";

const router = Router();
router.use(requireAuth);

router.get("/context", aiAssistantController.getContext);
router.post("/chat", validate(chatMessageSchema), aiAssistantController.streamReply);
router.get("/focus-suggestions", aiAssistantController.getFocusSuggestions);

export default router;