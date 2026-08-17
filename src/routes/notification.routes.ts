import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as notificationController from "../controllers/notification.controller";

const router = Router();
router.use(requireAuth);

router.get("/notifications", notificationController.list);
router.get("/notifications/unread-count", notificationController.unreadCount);
router.patch("/notifications/:id/read", notificationController.markRead);
router.post("/notifications/mark-all-read", notificationController.markAllRead);
router.delete("/notifications/:id", notificationController.remove);

export default router;