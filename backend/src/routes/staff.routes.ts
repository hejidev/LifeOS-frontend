import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireMerchant } from "../middlewares/merchant.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createStaffSchema, updateStaffSchema, clockInSchema, logActivitySchema } from "../validators/staff.validator";
import * as staffController from "../controllers/staff.controller";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);

router.get("/", staffController.listStaff);
router.post("/", validate(createStaffSchema), staffController.createStaff);
router.patch("/:id", validate(updateStaffSchema), staffController.updateStaff);
router.delete("/:id", staffController.deleteStaff);
router.post("/clock-in", validate(clockInSchema), staffController.clockIn);
router.post("/:id/activity", validate(logActivitySchema), staffController.logActivity);
router.get("/activity", staffController.getActivity);

export default router;