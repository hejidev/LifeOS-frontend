import { Router } from "express";
import { requireStaffSession } from "../middlewares/staff-session.middleware";
import * as staffShiftController from "../controllers/staff-shift.controller";

const router = Router();
router.use(requireStaffSession);

router.get("/", staffShiftController.getMyShifts);

export default router;