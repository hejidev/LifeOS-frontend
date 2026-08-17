import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { startConversationSchema, sendMessageSchema, contactSupportSchema } from "../validators/dm.validator";
import * as dmController from "../controllers/dm.controller";

const router = Router();
router.use(requireAuth);

router.post("/start", requirePermission("MESSAGE_USERS"), validate(startConversationSchema), dmController.startConversation);
router.post("/contact-support", validate(contactSupportSchema), dmController.contactSupport);
router.post("/:conversationId/messages", validate(sendMessageSchema), dmController.sendMessage);
router.get("/conversations", dmController.listConversations);
router.get("/:conversationId/messages", dmController.getMessages);

export default router;