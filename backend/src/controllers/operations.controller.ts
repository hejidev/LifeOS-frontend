import type { Response } from "express";
import { AppError, asyncHandler } from "../lib/errors";
import { prisma } from "../config/prisma";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import type { StaffRequest } from "../middlewares/staff-session.middleware";
import * as chatService from "../services/chat.service";
import * as notificationService from "../services/notification.service";
import * as reportService from "../services/report.service";
import * as stockService from "../services/stock.service";

async function staffContext(req: StaffRequest) {
  const [profile, staff] = await Promise.all([
    prisma.bizProfile.findUnique({ where: { id: req.staff!.bizProfileId }, select: { userId: true } }),
    prisma.bizStaff.findUnique({ where: { id: req.staff!.staffId }, select: { name: true } }),
  ]);
  if (!profile || !staff) throw new AppError("Staff session not found", 404);
  return { userId: profile.userId, name: staff.name };
}

export const ownerAdjustStock = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { delta, reason, note, storeId } = req.body;
  const result = await stockService.adjustStock({
    userId: req.user!.id,
    storeId,
    productId: req.params.id,
    delta,
    reason,
    note,
    actor: { type: "OWNER", id: req.user!.id, name: req.user!.name ?? "Owner" },
  });
  return res.json(result);
});

export const ownerStockHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const movements = await stockService.listMovements(req.user!.id, req.params.id, req.query.storeId as string | undefined);
  return res.json({ movements });
});

export const staffAdjustStock = asyncHandler(async (req: StaffRequest, res: Response) => {
  const context = await staffContext(req);
  const { delta, reason, note } = req.body;
  const result = await stockService.adjustStock({
    userId: context.userId,
    storeId: req.staff!.storeId,
    productId: req.params.id,
    delta,
    reason,
    note,
    actor: { type: "STAFF", id: req.staff!.staffId, name: context.name },
  });
  return res.json(result);
});

export const staffStockHistory = asyncHandler(async (req: StaffRequest, res: Response) => {
  const context = await staffContext(req);
  const movements = await stockService.listMovements(context.userId, req.params.id, req.staff!.storeId);
  return res.json({ movements });
});

export const dailyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const date = String(req.query.date ?? "");
  const offset = Number(req.query.offset ?? 0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
    throw new AppError("Use a date like 2026-10-28.", 400);
  }
  if (!Number.isInteger(offset) || Math.abs(offset) > 840) throw new AppError("Invalid time zone offset.", 400);

  const report = await reportService.getDailyReport(req.user!.id, {
    date,
    offsetMinutes: offset,
    storeId: req.query.storeId as string | undefined,
  });
  return res.json(report);
});

export const shiftSummary = asyncHandler(async (req: StaffRequest, res: Response) => {
  const since = new Date(String(req.query.since ?? ""));
  if (Number.isNaN(since.getTime())) throw new AppError("Invalid start time.", 400);
  const bounded = new Date(Math.max(since.getTime(), Date.now() - 48 * 3600 * 1000));
  const context = await staffContext(req);
  return res.json(await reportService.getShiftSummary(context.userId, req.staff!.staffId, bounded));
});

export const attention = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const actor = await chatService.ownerActor(req.user!.id, req.user!.name);
  const [counts, unreadNotifications, unreadChat] = await Promise.all([
    reportService.getAttention(req.user!.id, req.query.storeId as string | undefined),
    notificationService.getUnreadCount(req.user!.id),
    chatService.unreadTotal(actor),
  ]);
  return res.json({ ...counts, unreadNotifications, unreadChat });
});