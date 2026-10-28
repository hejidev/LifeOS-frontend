import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireMerchant } from "../middlewares/merchant.middleware";
import { requireStaffSession } from "../middlewares/staff-session.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as chat from "../controllers/chat.controller";
import { pushTokenRemovalSchema, pushTokenSchema, sendChatMessageSchema } from "../validators/chat.validator";

const router = Router();
const owner = [requireAuth, requireMerchant];

router.get("/merchant/chat/threads", ...owner, chat.ownerChat.threads);
router.get("/merchant/chat/unread-count", ...owner, chat.ownerChat.unread);
router.get("/merchant/chat/threads/:threadId/messages", ...owner, chat.ownerChat.messages);
router.post("/merchant/chat/threads/:threadId/messages", ...owner, validate(sendChatMessageSchema), chat.ownerChat.send);
router.post("/merchant/chat/threads/:threadId/read", ...owner, chat.ownerChat.read);

router.get("/staff-chat/threads", requireStaffSession, chat.staffChat.threads);
router.get("/staff-chat/unread-count", requireStaffSession, chat.staffChat.unread);
router.get("/staff-chat/threads/:threadId/messages", requireStaffSession, chat.staffChat.messages);
router.post("/staff-chat/threads/:threadId/messages", requireStaffSession, validate(sendChatMessageSchema), chat.staffChat.send);
router.post("/staff-chat/threads/:threadId/read", requireStaffSession, chat.staffChat.read);

router.post("/push/register", requireAuth, validate(pushTokenSchema), chat.registerOwnerPush);
router.post("/push/unregister", requireAuth, validate(pushTokenRemovalSchema), chat.removeOwnerPush);
router.post("/staff-push/register", requireStaffSession, validate(pushTokenSchema), chat.registerStaffPush);
router.post("/staff-push/unregister", requireStaffSession, validate(pushTokenRemovalSchema), chat.removeStaffPush);

export default router;