import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireMerchant } from "../middlewares/merchant.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createStaffSchema, updateStaffSchema, clockInSchema, logActivitySchema } from "../validators/staff.validator";
import { createShiftSchema, updateShiftSchema } from "../validators/staff-shift.validator";
import * as staffController from "../controllers/staff.controller";
import * as staffShiftController from "../controllers/staff-shift.controller";

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
router.get("/performance", staffController.getStaffPerformance);

router.get("/shifts", staffShiftController.listShifts);
router.post("/shifts", validate(createShiftSchema), staffShiftController.createShift);
router.patch("/shifts/:id", validate(updateShiftSchema), staffShiftController.updateShift);
router.delete("/shifts/:id", staffShiftController.deleteShift);

export default router;