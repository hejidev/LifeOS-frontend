import { Router } from "express";
import type { NextFunction, Response } from "express";
import { AppError } from "../lib/errors";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireMerchant } from "../middlewares/merchant.middleware";
import { requireStaffSession } from "../middlewares/staff-session.middleware";
import type { StaffRequest } from "../middlewares/staff-session.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as ops from "../controllers/operations.controller";
import * as register from "../controllers/register.controller";
import { closeRegisterSchema, openRegisterSchema, registerMovementSchema } from "../validators/operations.validator";
import { adjustStockSchema, collectPaymentSchema } from "../validators/operations.validator";
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

  async function cashRole(req: StaffRequest, _res: Response, next: NextFunction) {
    try {
      const member = await prisma.bizStaff.findFirst({
        where: { id: req.staff!.staffId, bizProfileId: req.staff!.bizProfileId },
        select: { role: true, status: true },
      });
      if (member && member.status === "ACTIVE" && member.role !== "INVENTORY_CLERK") return next();
      next(new AppError("Your role can't handle the cash register.", 403));
    } catch (err) {
      next(err);
    }
  }

router.post("/ops/products/:id/stock", ...owner, validate(adjustStockSchema), ops.ownerAdjustStock);
router.get("/ops/products/:id/stock-history", ...owner, ops.ownerStockHistory);
router.get("/ops/reports/daily", ...owner, ops.dailyReport);
router.get("/ops/attention", ...owner, ops.attention);
router.get("/ops/customers/:id/profile", ...owner, ops.customerProfile);
router.post("/ops/sales/:id/collect", ...owner, validate(collectPaymentSchema), ops.collectPayment);

router.post("/staff-ops/products/:id/stock", requireStaffSession, stockRole, validate(adjustStockSchema), ops.staffAdjustStock);
router.get("/staff-ops/products/:id/stock-history", requireStaffSession, ops.staffStockHistory);
router.get("/staff-ops/shift-summary", requireStaffSession, ops.shiftSummary);

router.get("/ops/sales/:id/payments", ...owner, ops.salePayments);
router.get("/ops/register/current", ...owner, register.ownerRegister.current);
router.get("/ops/register/history", ...owner, register.ownerRegister.history);
router.post("/ops/register/open", ...owner, validate(openRegisterSchema), register.ownerRegister.open);
router.post("/ops/register/movements", ...owner, validate(registerMovementSchema), register.ownerRegister.movement);
router.post("/ops/register/close", ...owner, validate(closeRegisterSchema), register.ownerRegister.close);

router.get("/staff-ops/register/current", requireStaffSession, cashRole, register.staffRegister.current);
router.post("/staff-ops/register/open", requireStaffSession, cashRole, validate(openRegisterSchema), register.staffRegister.open);
router.post("/staff-ops/register/movements", requireStaffSession, cashRole, validate(registerMovementSchema), register.staffRegister.movement);
router.post("/staff-ops/register/close", requireStaffSession, cashRole, validate(closeRegisterSchema), register.staffRegister.close);

export default router;