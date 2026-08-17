import { Router } from "express";
import { requireStaffSession } from "../middlewares/staff-session.middleware";
import { validate } from "../middlewares/validate.middleware";
import { logSelfActivitySchema } from "../validators/staff-portal.validator";
import * as staffPortalController from "../controllers/staff-portal.controller";

const router = Router();
router.use(requireStaffSession);

router.post("/activity", validate(logSelfActivitySchema), staffPortalController.logActivity);
router.get("/activity", staffPortalController.getActivity);
router.post("/clock-out", staffPortalController.clockOut);
router.get("/team", staffPortalController.getTeam);

export default router;