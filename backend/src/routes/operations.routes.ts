import { Router } from "express";
import type { NextFunction, Response } from "express";
import { AppError } from "../lib/errors";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireMerchant } from "../middlewares/merchant.middleware";
import { requireStaffSession } from "../middlewares/staff-session.middleware";
import type { StaffRequest } from "../middlewares/staff-session.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as ops from "../controllers/operations.controller";
import { adjustStockSchema } from "../validators/operations.validator";

const router = Router();
const owner = [requireAuth, requireMerchant];

function stockRole(req: StaffRequest, _res: Response, next: NextFunction) {
  if (req.staff && ["INVENTORY_CLERK", "MANAGER"].includes(req.staff.role)) return next();
  next(new AppError("Your role can't change stock levels.", 403));
}

router.post("/ops/products/:id/stock", ...owner, validate(adjustStockSchema), ops.ownerAdjustStock);
router.get("/ops/products/:id/stock-history", ...owner, ops.ownerStockHistory);
router.get("/ops/reports/daily", ...owner, ops.dailyReport);
router.get("/ops/attention", ...owner, ops.attention);

router.post("/staff-ops/products/:id/stock", requireStaffSession, stockRole, validate(adjustStockSchema), ops.staffAdjustStock);
router.get("/staff-ops/products/:id/stock-history", requireStaffSession, ops.staffStockHistory);
router.get("/staff-ops/shift-summary", requireStaffSession, ops.shiftSummary);

export default router;