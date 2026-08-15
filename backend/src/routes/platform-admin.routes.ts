import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/roles.middleware";
import * as platformAdminController from "../controllers/platform-admin.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { confirmSupportEmailChangeSchema, deleteUserSchema, supportEmailChangeSchema, supportReasonSchema } from "../validators/admin-management.validator";

const router = Router();
router.post("/support/email-change/confirm", validate(confirmSupportEmailChangeSchema), platformAdminController.confirmSupportEmailChange);
router.use(requireAuth);
router.use(requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/users", requirePermission("MANAGE_USERS"), platformAdminController.listUsers);
router.get("/my-permissions", platformAdminController.getMyPermissions);
router.patch("/users/:id/toggle-status", requirePermission("MANAGE_USERS"), platformAdminController.toggleUserStatus);
router.post("/users/:id/support/password-reset", requirePermission("MANAGE_USERS"), validate(supportReasonSchema), platformAdminController.sendSupportPasswordReset);
router.post("/users/:id/support/email-change", requirePermission("MANAGE_USERS"), validate(supportEmailChangeSchema), platformAdminController.requestSupportEmailChange);
router.post("/users/:id/support/reset-two-factor", requirePermission("MANAGE_USERS"), validate(supportReasonSchema), platformAdminController.resetSupportTwoFactor);
router.delete("/users/:id", requireRole("SUPER_ADMIN"), validate(deleteUserSchema), platformAdminController.deleteUser);
router.get("/tenants", platformAdminController.listTenants);
router.get("/billing", platformAdminController.getBillingStats);
router.get("/analytics", platformAdminController.getAnalytics);

router.get("/overview", platformAdminController.getOverview);
router.get("/audit-log", platformAdminController.getAuditLog);

export default router;
