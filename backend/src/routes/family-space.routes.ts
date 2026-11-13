import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as controller from "../controllers/family-space.controller";

const router = Router();
router.use(requireAuth);

router.get("/me", controller.me);
router.post("/setup", validate(controller.setupSchema), controller.setup);
router.get("/members", controller.members);
router.post("/children", validate(controller.createChildSchema), controller.createChild);
router.patch("/children/:memberId/password", validate(controller.passwordSchema), controller.resetPassword);
router.delete("/children/:memberId", controller.deleteChild);
router.put("/children/:memberId/schedules", validate(controller.schedulesSchema), controller.saveSchedules);
router.post("/children/:memberId/override", validate(controller.overrideSchema), controller.setOverride);
router.delete("/children/:memberId/override", controller.clearOverride);
router.get("/threads", controller.threads);
router.get("/threads/:key/messages", controller.messages);
router.post("/threads/:key/messages", validate(controller.messageSchema), controller.send);
router.post("/threads/:key/read", controller.read);

export default router;