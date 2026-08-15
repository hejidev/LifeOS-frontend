import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/roles.middleware";
import { requireMerchant } from "../middlewares/merchant.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { applyMerchantSchema, reviewApplicationSchema, merchantCheckoutSchema, notificationSettingsSchema, pauseStoreSchema } from "../validators/merchant.validator";
import * as merchantController from "../controllers/merchant.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Only images or PDF are allowed for ID documents"));
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth);

router.get("/status", merchantController.getStatus);
router.post("/apply", validate(applyMerchantSchema), merchantController.apply);
router.post("/id-upload", upload.single("file"), merchantController.uploadIdDocument);
router.post("/checkout", validate(merchantCheckoutSchema), merchantController.checkout);
router.post("/billing-portal", merchantController.portal);

router.get("/applications", requirePermission("MANAGE_MERCHANTS"), merchantController.listApplications);
router.get("/applications/:id", requirePermission("MANAGE_MERCHANTS"), merchantController.getApplicationDetail);
router.patch("/applications/:id", requirePermission("MANAGE_MERCHANTS"), validate(reviewApplicationSchema), merchantController.reviewApplication);
router.patch("/applications/:id/verify-id", requirePermission("MANAGE_MERCHANTS"), merchantController.verifyId);
router.get("/staff-login-code", requireMerchant, merchantController.getStaffLoginCode);
router.post("/staff-login-code/regenerate", requireMerchant, merchantController.regenerateStoreCode);
router.post("/staff/force-logout", requireMerchant, merchantController.forceStaffLogout);
router.patch("/notifications", requireMerchant, validate(notificationSettingsSchema), merchantController.updateNotificationSettings);
router.patch("/pause", requireMerchant, validate(pauseStoreSchema), merchantController.setPaused);

export default router;