"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerProfile = getCustomerProfile;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const num = (value) => (value == null ? 0 : Number(value));
function summarize(items) {
    const shown = items.slice(0, 2).map((item) => `${item.quantity} × ${item.name}`);
    const extra = items.length - shown.length;
    return extra > 0 ? `${shown.join(", ")} +${extra} more` : shown.join(", ");
}
function lite(sale) {
    return {
        id: sale.id,
        receiptNumber: sale.receiptNumber,
        total: num(sale.total),
        amountPaid: num(sale.amountPaid),
        balance: sale.status === "PENDING" ? Math.round((num(sale.total) - num(sale.amountPaid)) * 100) / 100 : 0,
        status: sale.status,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt.toISOString(),
        storeName: sale.store?.name ?? null,
        itemCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
        summary: summarize(sale.items),
    };
}
async function getCustomerProfile(userId, customerId) {
    const [business, customer] = await Promise.all([
        prisma_1.prisma.bizProfile.findUnique({ where: { userId }, select: { currency: true } }),
        prisma_1.prisma.bizCustomer.findFirst({ where: { id: customerId, userId } }),
    ]);
    if (!customer)
        throw new errors_1.AppError("Customer not found", 404);
    const include = { items: true, store: { select: { name: true } } };
    const [paid, pending, recent] = await Promise.all([
        prisma_1.prisma.bizSale.aggregate({
            where: { customerId, userId, status: "PAID" },
            _sum: { total: true },
            _count: true,
            _min: { createdAt: true },
            _max: { createdAt: true },
        }),
        prisma_1.prisma.bizSale.findMany({ where: { customerId, userId, status: "PENDING" }, orderBy: { createdAt: "asc" }, include }),
        prisma_1.prisma.bizSale.findMany({ where: { customerId, userId }, orderBy: { createdAt: "desc" }, take: 200, include }),
    ]);
    const lifetimeSpend = num(paid._sum.total);
    const orders = paid._count;
    const balance = Math.round(pending.reduce((sum, sale) => sum + num(sale.total) - num(sale.amountPaid), 0) * 100) / 100;
    const tally = new Map();
    for (const sale of recent) {
        if (sale.status !== "PAID")
            continue;
        for (const item of sale.items) {
            const key = item.productId ?? item.name;
            const row = tally.get(key) ?? { name: item.name, units: 0, revenue: 0 };
            row.units += item.quantity;
            row.revenue += num(item.lineTotal);
            tally.set(key, row);
        }
    }
    return {
        currency: business?.currency ?? "NGN",
        customer: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone ?? undefined,
            email: customer.email ?? undefined,
            notes: customer.notes ?? undefined,
            loyaltyPoints: customer.loyaltyPoints ?? 0,
            totalSpent: lifetimeSpend,
            orderCount: orders,
            balance,
            createdAt: customer.createdAt.toISOString(),
        },
        stats: {
            lifetimeSpend,
            orders,
            averageOrder: orders > 0 ? Math.round(lifetimeSpend / orders) : 0,
            firstPurchaseAt: paid._min.createdAt?.toISOString() ?? null,
            lastPurchaseAt: paid._max.createdAt?.toISOString() ?? null,
            balance,
            pendingCount: pending.length,
        },
        favourites: [...tally.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 5),
        pending: pending.map(lite),
        recent: recent.slice(0, 30).map(lite),
    };
}
