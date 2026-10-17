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
exports.getAnalytics = getAnalytics;
const prisma_1 = require("../config/prisma");
const storeService = __importStar(require("./store.service"));
const num = (d) => (d == null ? 0 : Number(d));
function resolveRange(params) {
    if (params.from) {
        const start = new Date(params.from);
        const end = params.to
            ? new Date(new Date(params.to).getTime() + 24 * 60 * 60 * 1000)
            : new Date(start.getTime() + 24 * 60 * 60 * 1000);
        return { start, end };
    }
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    switch (params.range) {
        case "week": {
            const d = new Date(now);
            const day = d.getDay() === 0 ? 7 : d.getDay();
            return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1), end };
        }
        case "quarter":
            return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end };
        case "year":
            return { start: new Date(now.getFullYear(), 0, 1), end };
        case "month":
        default:
            return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    }
}
function dayKey(d) {
    return d.toISOString().slice(0, 10);
}
async function getAnalytics(userId, params, storeId) {
    const { start, end } = resolveRange(params);
    const resolvedStoreId = storeId ? await storeService.resolveStoreId(userId, storeId) : undefined;
    const salesWhere = { userId, status: "PAID", createdAt: { gte: start, lt: end } };
    if (resolvedStoreId)
        salesWhere.storeId = resolvedStoreId;
    const sales = await prisma_1.prisma.bizSale.findMany({
        where: salesWhere,
        include: { items: true },
        orderBy: { createdAt: "asc" },
    });
    const dailyMap = new Map();
    const cursor = new Date(start);
    while (cursor < end) {
        dailyMap.set(dayKey(cursor), 0);
        cursor.setDate(cursor.getDate() + 1);
    }
    for (const s of sales) {
        const key = dayKey(s.createdAt);
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + num(s.total));
    }
    const dailyTrend = [...dailyMap.entries()].map(([date, revenue]) => ({ date, revenue }));
    const productStats = new Map();
    for (const s of sales) {
        for (const it of s.items) {
            const key = it.productId ?? `unlinked:${it.name}`;
            const cur = productStats.get(key) ?? { id: it.productId ?? null, name: it.name, unitsSold: 0, revenue: 0 };
            cur.unitsSold += it.quantity;
            cur.revenue += num(it.lineTotal);
            productStats.set(key, cur);
        }
    }
    const topProducts = [...productStats.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    const soldProductIds = new Set(sales.flatMap((s) => s.items.map((it) => it.productId).filter(Boolean)));
    let deadStock = [];
    if (resolvedStoreId) {
        const inventory = await prisma_1.prisma.storeInventory.findMany({
            where: { storeId: resolvedStoreId, stock: { gt: 0 }, product: { userId, active: true } },
            include: { product: { select: { id: true, name: true } } },
        });
        deadStock = inventory
            .filter((inv) => !soldProductIds.has(inv.product.id))
            .map((inv) => ({ id: inv.product.id, name: inv.product.name, stock: inv.stock }))
            .slice(0, 10);
    }
    const customerIdsInPeriod = [...new Set(sales.map((s) => s.customerId).filter(Boolean))];
    let newCustomers = 0;
    let returningCustomers = 0;
    if (customerIdsInPeriod.length > 0) {
        const priorSales = await prisma_1.prisma.bizSale.groupBy({
            by: ["customerId"],
            where: { userId, status: "PAID", customerId: { in: customerIdsInPeriod }, createdAt: { lt: start } },
        });
        const hadPriorSale = new Set(priorSales.map((p) => p.customerId));
        for (const id of customerIdsInPeriod) {
            if (hadPriorSale.has(id))
                returningCustomers++;
            else
                newCustomers++;
        }
    }
    const repeatOrderCustomerCount = new Map();
    for (const s of sales) {
        if (!s.customerId)
            continue;
        repeatOrderCustomerCount.set(s.customerId, (repeatOrderCustomerCount.get(s.customerId) ?? 0) + 1);
    }
    const repeatBuyers = [...repeatOrderCustomerCount.values()].filter((c) => c >= 2).length;
    const totalRevenue = sales.reduce((sum, s) => sum + num(s.total), 0);
    const orderCount = sales.length;
    const avgOrderValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
    return {
        dailyTrend,
        topProducts,
        deadStock,
        customerRetention: { newCustomers, returningCustomers, repeatBuyers, totalCustomersInPeriod: customerIdsInPeriod.length },
        summary: { totalRevenue, orderCount, avgOrderValue },
    };
}
