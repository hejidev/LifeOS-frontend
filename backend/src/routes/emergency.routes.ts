import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  updateEmergencyProfileSchema, createContactSchema, updateContactSchema,
  reorderContactsSchema, enableShareSchema, setPinSchema, publicQuerySchema,
} from "../validators/emergency.validator";
import * as emergencyController from "../controllers/emergency.controller";

const router = Router();

router.get("/emergency/public/:token", validate(publicQuerySchema), emergencyController.getPublic);

router.use(requireAuth);
router.get("/emergency/profile", emergencyController.getProfile);
router.patch("/emergency/profile", validate(updateEmergencyProfileSchema), emergencyController.updateProfile);
router.post("/emergency/contacts", validate(createContactSchema), emergencyController.addContact);
router.patch("/emergency/contacts/:id", validate(updateContactSchema), emergencyController.updateContact);
router.delete("/emergency/contacts/:id", emergencyController.deleteContact);
router.post("/emergency/contacts/reorder", validate(reorderContactsSchema), emergencyController.reorderContacts);
router.post("/emergency/share/enable", validate(enableShareSchema), emergencyController.enableShare);
router.post("/emergency/share/disable", emergencyController.disableShare);
router.post("/emergency/share/pin", validate(setPinSchema), emergencyController.setPin);
router.get("/emergency/access-log", emergencyController.getAccessLog);

export default router;