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
exports.dayBounds = dayBounds;
exports.getDailyReport = getDailyReport;
exports.getShiftSummary = getShiftSummary;
exports.getAttention = getAttention;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const storeService = __importStar(require("./store.service"));
const num = (value) => (value == null ? 0 : Number(value));
function dayBounds(date, offsetMinutes) {
    const [year, month, day] = date.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, day) - offsetMinutes * 60000);
    return { start, end: new Date(start.getTime() + 86400000) };
}
function tally(rows, keyOf, totalOf) {
    const map = new Map();
    for (const row of rows) {
        const key = keyOf(row);
        const current = map.get(key) ?? { count: 0, total: 0 };
        current.count += 1;
        current.total += totalOf(row);
        map.set(key, current);
    }
    return map;
}
async function getDailyReport(userId, params) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId }, select: { businessName: true, currency: true } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    const storeId = params.storeId ? await storeService.resolveStoreId(userId, params.storeId) : undefined;
    const { start, end } = dayBounds(params.date, params.offsetMinutes);
    const storeFilter = storeId ? { storeId } : {};
    const [sales, expenses] = await Promise.all([
        prisma_1.prisma.bizSale.findMany({ where: { userId, createdAt: { gte: start, lt: end }, ...storeFilter }, include: { items: true } }),
        prisma_1.prisma.bizExpense.findMany({ where: { userId, date: { gte: start, lt: end }, ...storeFilter } }),
    ]);
    const paid = sales.filter((sale) => sale.status === "PAID");
    const refunded = sales.filter((sale) => sale.status === "REFUNDED");
    const revenue = paid.reduce((sum, sale) => sum + num(sale.total), 0);
    const expenseTotal = expenses.reduce((sum, expense) => sum + num(expense.amount), 0);
    const staffIds = [...new Set(paid.map((sale) => sale.staffId).filter((id) => !!id))];
    const staff = staffIds.length > 0 ? await prisma_1.prisma.bizStaff.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } }) : [];
    const staffNames = new Map(staff.map((member) => [member.id, member.name]));
    const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0, count: 0 }));
    for (const sale of paid) {
        const hour = new Date(sale.createdAt.getTime() + params.offsetMinutes * 60000).getUTCHours();
        hourly[hour].total += num(sale.total);
        hourly[hour].count += 1;
    }
    const products = new Map();
    for (const sale of paid) {
        for (const item of sale.items) {
            const key = item.productId ?? item.name;
            const current = products.get(key) ?? { name: item.name, units: 0, revenue: 0 };
            current.units += item.quantity;
            current.revenue += num(item.lineTotal);
            products.set(key, current);
        }
    }
    return {
        date: params.date,
        businessName: profile.businessName,
        currency: profile.currency,
        summary: {
            revenue,
            orders: paid.length,
            avgOrderValue: paid.length > 0 ? Math.round(revenue / paid.length) : 0,
            discounts: paid.reduce((sum, sale) => sum + num(sale.discount), 0),
            refundedCount: refunded.length,
            refundedTotal: refunded.reduce((sum, sale) => sum + num(sale.total), 0),
            expenses: expenseTotal,
            expenseCount: expenses.length,
            net: revenue - expenseTotal,
            needsReview: sales.filter((sale) => sale.needsReview).length,
        },
        byPayment: [...tally(paid, (sale) => sale.paymentMethod, (sale) => num(sale.total))].map(([method, value]) => ({ method, ...value })).sort((a, b) => b.total - a.total),
        byStaff: [...tally(paid, (sale) => sale.staffId ?? "unassigned", (sale) => num(sale.total))]
            .map(([id, value]) => ({ id: id === "unassigned" ? null : id, name: id === "unassigned" ? "Owner or unassigned" : staffNames.get(id) ?? "Former staff", ...value }))
            .sort((a, b) => b.total - a.total),
        hourly,
        topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    };
}
async function getShiftSummary(userId, staffId, since) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId }, select: { currency: true } });
    const [sales, refunds] = await Promise.all([
        prisma_1.prisma.bizSale.findMany({
            where: { userId, staffId, status: "PAID", createdAt: { gte: since } },
            include: { items: { select: { quantity: true } } },
        }),
        prisma_1.prisma.bizSale.aggregate({
            where: { userId, staffId, status: "REFUNDED", createdAt: { gte: since } },
            _count: true,
            _sum: { total: true },
        }),
    ]);
    return {
        since: since.toISOString(),
        currency: profile?.currency ?? "NGN",
        orders: sales.length,
        revenue: sales.reduce((sum, sale) => sum + num(sale.total), 0),
        items: sales.reduce((sum, sale) => sum + sale.items.reduce((inner, item) => inner + item.quantity, 0), 0),
        discounts: sales.reduce((sum, sale) => sum + num(sale.discount), 0),
        byPayment: [...tally(sales, (sale) => sale.paymentMethod, (sale) => num(sale.total))].map(([method, value]) => ({ method, ...value })).sort((a, b) => b.total - a.total),
        refunded: { count: refunds._count, total: num(refunds._sum.total) },
    };
}
async function getAttention(userId, storeId) {
    const resolved = storeId ? await storeService.resolveStoreId(userId, storeId) : undefined;
    const [inventory, needsReview] = await Promise.all([
        prisma_1.prisma.storeInventory.findMany({
            where: { product: { userId, active: true }, ...(resolved ? { storeId: resolved } : {}) },
            select: { stock: true, lowStockAt: true },
        }),
        prisma_1.prisma.bizSale.count({ where: { userId, needsReview: true, ...(resolved ? { storeId: resolved } : {}) } }),
    ]);
    return { lowStock: inventory.filter((row) => row.stock <= row.lowStockAt).length, needsReview };
}
