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
import { prisma } from "../config/prisma";

const router = Router();
const owner = [requireAuth, requireMerchant];

async function stockRole(req: StaffRequest, _res: Response, next: NextFunction) {
    try {
      const member = await prisma.bizStaff.findFirst({
        where: { id: req.staff!.staffId, bizProfileId: req.staff!.bizProfileId },
        select: { role: true, status: true },
      });
      if (member && member.status === "ACTIVE" && ["INVENTORY_CLERK", "MANAGER"].includes(member.role)) return next();
      next(new AppError("Your role can't change stock levels.", 403));
    } catch (err) {
      next(err);
    }
  }

router.post("/ops/products/:id/stock", ...owner, validate(adjustStockSchema), ops.ownerAdjustStock);
router.get("/ops/products/:id/stock-history", ...owner, ops.ownerStockHistory);
router.get("/ops/reports/daily", ...owner, ops.dailyReport);
router.get("/ops/attention", ...owner, ops.attention);

router.post("/staff-ops/products/:id/stock", requireStaffSession, stockRole, validate(adjustStockSchema), ops.staffAdjustStock);
router.get("/staff-ops/products/:id/stock-history", requireStaffSession, ops.staffStockHistory);
router.get("/staff-ops/shift-summary", requireStaffSession, ops.shiftSummary);

export default router;