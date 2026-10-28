"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.attention = exports.shiftSummary = exports.dailyReport = exports.staffStockHistory = exports.staffAdjustStock = exports.ownerStockHistory = exports.ownerAdjustStock = void 0;
const errors_1 = require("../lib/errors");
const prisma_1 = require("../config/prisma");
const chatService = __importStar(require("../services/chat.service"));
const notificationService = __importStar(require("../services/notification.service"));
const reportService = __importStar(require("../services/report.service"));
const stockService = __importStar(require("../services/stock.service"));
async function staffContext(req) {
    const [profile, staff] = await Promise.all([
        prisma_1.prisma.bizProfile.findUnique({ where: { id: req.staff.bizProfileId }, select: { userId: true } }),
        prisma_1.prisma.bizStaff.findUnique({ where: { id: req.staff.staffId }, select: { name: true } }),
    ]);
    if (!profile || !staff)
        throw new errors_1.AppError("Staff session not found", 404);
    return { userId: profile.userId, name: staff.name };
}
exports.ownerAdjustStock = (0, errors_1.asyncHandler)(async (req, res) => {
    const { delta, reason, note, storeId } = req.body;
    const result = await stockService.adjustStock({
        userId: req.user.id,
        storeId,
        productId: req.params.id,
        delta,
        reason,
        note,
        actor: { type: "OWNER", id: req.user.id, name: req.user.name ?? "Owner" },
    });
    return res.json(result);
});
exports.ownerStockHistory = (0, errors_1.asyncHandler)(async (req, res) => {
    const movements = await stockService.listMovements(req.user.id, req.params.id, req.query.storeId);
    return res.json({ movements });
});
exports.staffAdjustStock = (0, errors_1.asyncHandler)(async (req, res) => {
    const context = await staffContext(req);
    const { delta, reason, note } = req.body;
    const result = await stockService.adjustStock({
        userId: context.userId,
        storeId: req.staff.storeId,
        productId: req.params.id,
        delta,
        reason,
        note,
        actor: { type: "STAFF", id: req.staff.staffId, name: context.name },
    });
    return res.json(result);
});
exports.staffStockHistory = (0, errors_1.asyncHandler)(async (req, res) => {
    const context = await staffContext(req);
    const movements = await stockService.listMovements(context.userId, req.params.id, req.staff.storeId);
    return res.json({ movements });
});
exports.dailyReport = (0, errors_1.asyncHandler)(async (req, res) => {
    const date = String(req.query.date ?? "");
    const offset = Number(req.query.offset ?? 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
        throw new errors_1.AppError("Use a date like 2026-10-28.", 400);
    }
    if (!Number.isInteger(offset) || Math.abs(offset) > 840)
        throw new errors_1.AppError("Invalid time zone offset.", 400);
    const report = await reportService.getDailyReport(req.user.id, {
        date,
        offsetMinutes: offset,
        storeId: req.query.storeId,
    });
    return res.json(report);
});
exports.shiftSummary = (0, errors_1.asyncHandler)(async (req, res) => {
    const since = new Date(String(req.query.since ?? ""));
    if (Number.isNaN(since.getTime()))
        throw new errors_1.AppError("Invalid start time.", 400);
    const bounded = new Date(Math.max(since.getTime(), Date.now() - 48 * 3600 * 1000));
    const context = await staffContext(req);
    return res.json(await reportService.getShiftSummary(context.userId, req.staff.staffId, bounded));
});
exports.attention = (0, errors_1.asyncHandler)(async (req, res) => {
    const actor = await chatService.ownerActor(req.user.id, req.user.name);
    const [counts, unreadNotifications, unreadChat] = await Promise.all([
        reportService.getAttention(req.user.id, req.query.storeId),
        notificationService.getUnreadCount(req.user.id),
        chatService.unreadTotal(actor),
    ]);
    return res.json({ ...counts, unreadNotifications, unreadChat });
});
