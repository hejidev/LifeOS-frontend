import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createMemberSchema, updateMemberSchema, createControlSchema, updateControlSchema,
  createInviteSchema, acceptInviteSchema,
} from "../validators/family.validator";
import * as familyController from "../controllers/family.controller";

const router = Router();

// Public — no auth, since the invitee isn't logged in yet
router.get("/family/invites/:token", familyController.getInvite);
router.post("/family/invites/accept", validate(acceptInviteSchema), familyController.acceptInvite);

router.use(requireAuth);

router.get("/family/dashboard", familyController.getDashboard);
router.post("/family/members", validate(createMemberSchema), familyController.createMember);
router.patch("/family/members/:id", validate(updateMemberSchema), familyController.updateMember);
router.delete("/family/members/:id", familyController.deleteMember);
router.post("/family/controls", validate(createControlSchema), familyController.createControl);
router.patch("/family/controls/:id", validate(updateControlSchema), familyController.updateControl);
router.delete("/family/controls/:id", familyController.deleteControl);
router.post("/family/invites", validate(createInviteSchema), familyController.createInvite);
router.delete("/family/invites/:id", familyController.revokeInvite);

export default router;