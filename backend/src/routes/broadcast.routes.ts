import { Router } from "express";
import type { Response } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../lib/errors";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { broadcastSchema } from "../validators/admin-management.validator";
import { sendBroadcast } from "../services/admin-management.service";

const router = Router();
router.use(requireAuth);
router.use(requirePermission("SEND_BROADCASTS"));

router.post("/", validate(broadcastSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await sendBroadcast(req.user!.id, req.body);
  return res.json(result);
}));

export default router;