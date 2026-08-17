import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/roles.middleware";
import { validate } from "../middlewares/validate.middleware";
import { changeRoleSchema, createAdminSchema, permissionSchema } from "../validators/admin-management.validator";
import * as adminManagementController from "../controllers/admin-management.controller";

const router = Router();
router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

router.patch("/users/:id/role", validate(changeRoleSchema), adminManagementController.changeRole);
router.post("/create-admin", validate(createAdminSchema), adminManagementController.createAdmin);
router.get("/admins", adminManagementController.getAdmins);
router.post("/users/:id/permissions", validate(permissionSchema), adminManagementController.grantPermission);
router.delete("/users/:id/permissions", validate(permissionSchema), adminManagementController.revokePermission);

export default router;