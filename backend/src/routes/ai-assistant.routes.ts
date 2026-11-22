import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { chatMessageSchema, conversationParamsSchema } from "../validators/ai-assistant.validator";
import * as controller from "../controllers/ai-assistant.controller";

const router = Router();
router.use(requireAuth);

router.get("/context", controller.getContext);
router.get("/focus-suggestions", controller.getFocusSuggestions);
router.get("/conversations", controller.listConversations);
router.get("/conversations/:id", validate(conversationParamsSchema), controller.getConversation);
router.delete("/conversations/:id", validate(conversationParamsSchema), controller.deleteConversation);
router.post("/chat", validate(chatMessageSchema), controller.streamReply);
router.get("/brief", controller.getBrief);
router.post("/brief", controller.createBrief);

export default router;