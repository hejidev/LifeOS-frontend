import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as settingsController from "../controllers/settings.controller";
import {
  updateProfileSchema,
  updatePreferencesSchema,
  updateNotificationsSchema,
  changePasswordSchema,
  deactivateAccountSchema,
} from "../validators/settings.validator";
import { rateLimitUser } from "../lib/rate-limit";

const router = Router();
router.use(requireAuth);

router.get("/profile", settingsController.getProfile);
router.patch("/profile", validate(updateProfileSchema), settingsController.updateProfile);
router.patch("/preferences", validate(updatePreferencesSchema), settingsController.updatePreferences);
router.patch("/notifications", validate(updateNotificationsSchema), settingsController.updateNotifications);
router.post("/change-password", validate(changePasswordSchema), settingsController.changePassword);
router.get("/overview", settingsController.getAccountOverview);
router.post("/deactivate", validate(deactivateAccountSchema), settingsController.deactivateAccount);
router.get("/export", rateLimitUser("data-export", 3, 86_400, "You can export your data three times a day."), settingsController.exportData);

export default router;