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
exports.getOrCreateProfile = getOrCreateProfile;
exports.updateProfile = updateProfile;
exports.listProducts = listProducts;
exports.createProduct = createProduct;
exports.uploadProductImage = uploadProductImage;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.getProductByBarcode = getProductByBarcode;
exports.listCustomers = listCustomers;
exports.createCustomer = createCustomer;
exports.updateCustomer = updateCustomer;
exports.createSale = createSale;
exports.listSales = listSales;
exports.updateSaleStatus = updateSaleStatus;
exports.listExpenses = listExpenses;
exports.createExpense = createExpense;
exports.deleteExpense = deleteExpense;
exports.getDashboard = getDashboard;
exports.listProductsPaged = listProductsPaged;
exports.bulkImportProducts = bulkImportProducts;
exports.exportProductsCSV = exportProductsCSV;
exports.exportSalesCSV = exportSalesCSV;
exports.exportCustomersCSV = exportCustomersCSV;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const cloudinary_1 = require("../config/cloudinary");
const storeService = __importStar(require("./store.service"));
const notification_service_1 = require("./notification.service");
const csv_1 = require("../lib/csv");
const num = (d) => d == null ? 0 : Number(d);
function serializeProduct(p, storeStock) {
    const stock = storeStock?.stock ?? p.stock;
    const lowStockAt = storeStock?.lowStockAt ?? p.lowStockAt;
    return {
        id: p.id,
        name: p.name,
        sku: p.sku ?? undefined,
        barcode: p.barcode ?? undefined,
        category: p.category ?? undefined,
        price: num(p.price),
        cost: p.cost != null ? num(p.cost) : undefined,
        stock,
        lowStockAt,
        imageUrl: p.imageUrl ?? undefined,
        active: p.active,
        margin: p.cost != null && num(p.price) > 0
            ? Math.round(((num(p.price) - num(p.cost)) / num(p.price)) * 100)
            : undefined,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
    };
}
function serializeCustomer(c, totalSpent = 0, orderCount = 0, lastOrderAt = null) {
    return {
        id: c.id,
        name: c.name,
        phone: c.phone ?? undefined,
        email: c.email ?? undefined,
        notes: c.notes ?? undefined,
        totalSpent,
        orderCount,
        loyaltyPoints: c.loyaltyPoints ?? 0,
        lastOrderAt: lastOrderAt ?? undefined,
        createdAt: c.createdAt.toISOString(),
    };
}
function serializeSale(s) {
    return {
        id: s.id,
        receiptNumber: s.receiptNumber,
        customerId: s.customerId ?? undefined,
        customerName: s.customer?.name ?? undefined,
        storeId: s.storeId ?? undefined,
        storeName: s.store?.name ?? undefined,
        items: s.items.map((it) => ({
            id: it.id,
            productId: it.productId ?? undefined,
            name: it.name,
            quantity: it.quantity,
            unitPrice: num(it.unitPrice),
            lineTotal: num(it.lineTotal),
        })),
        subtotal: num(s.subtotal),
        discount: num(s.discount),
        total: num(s.total),
        paymentMethod: s.paymentMethod,
        status: s.status,
        note: s.note ?? undefined,
        createdAt: s.createdAt.toISOString(),
    };
}
function serializeExpense(e) {
    return {
        id: e.id,
        title: e.title,
        category: e.category,
        amount: num(e.amount),
        date: e.date.toISOString(),
        note: e.note ?? undefined,
        createdAt: e.createdAt.toISOString(),
    };
}
function genReceiptNumber() {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `RCPT-${stamp}-${rand}`;
}
function rangeStart(range) {
    const now = new Date();
    if (range === "today")
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === "week") {
        const d = new Date(now);
        const day = d.getDay() === 0 ? 7 : d.getDay();
        d.setDate(d.getDate() - day + 1);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    return new Date(now.getFullYear(), now.getMonth(), 1);
}
// ── Profile ─────────────────────────────────────────────────────────────
async function getOrCreateProfile(userId) {
    let profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        profile = await prisma_1.prisma.bizProfile.create({
            data: { userId, businessName: `${user?.name ?? "My"}'s Business` },
        });
    }
    return profile;
}
async function updateProfile(userId, data) {
    await getOrCreateProfile(userId);
    return prisma_1.prisma.bizProfile.update({ where: { userId }, data });
}
// ── Products ────────────────────────────────────────────────────────────
async function listProducts(userId, activeOnly = false, storeId) {
    const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
    const products = await prisma_1.prisma.bizProduct.findMany({
        where: { userId, ...(activeOnly ? { active: true } : {}) },
        include: { storeInventory: { where: { storeId: resolvedStoreId } } },
        orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    return products.map((p) => {
        const inv = p.storeInventory[0];
        return serializeProduct(p, inv ? { stock: inv.stock, lowStockAt: inv.lowStockAt } : { stock: 0, lowStockAt: p.lowStockAt });
    });
}
async function createProduct(userId, data, storeId) {
    const profile = await getOrCreateProfile(userId);
    const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
    const { stock, lowStockAt, ...productData } = data;
    const effectiveLowStockAt = lowStockAt ?? 3;
    const product = await prisma_1.prisma.$transaction(async (tx) => {
        const created = await tx.bizProduct.create({
            data: { ...productData, lowStockAt: effectiveLowStockAt, userId },
        });
        const allStores = await tx.store.findMany({ where: { bizProfileId: profile.id, active: true } });
        await tx.storeInventory.createMany({
            data: allStores.map((s) => ({
                storeId: s.id,
                productId: created.id,
                stock: s.id === resolvedStoreId ? (stock ?? 0) : 0,
                lowStockAt: effectiveLowStockAt,
            })),
        });
        return created;
    });
    return serializeProduct(product, { stock: stock ?? 0, lowStockAt: effectiveLowStockAt });
}
async function uploadProductImage(buffer, fileName) {
    const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader.upload_stream({
            folder: "lifeos/product-images",
            resource_type: "image",
            public_id: `product-${Date.now()}-${fileName.replace(/\.[^/.]+$/, "")}`,
            transformation: [
                { width: 800, height: 800, crop: "limit", quality: "auto" },
                { fetch_format: "auto" }
            ]
        }, (err, result) => (err || !result ? reject(err) : resolve(result)));
        stream.end(buffer);
    });
    return { url: uploaded.secure_url, publicId: uploaded.public_id };
}
async function updateProduct(userId, id, data, storeId) {
    const existing = await prisma_1.prisma.bizProduct.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Product not found", 404);
    const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
    const { stock, lowStockAt, ...productData } = data;
    let previousInv = null;
    if (stock !== undefined || lowStockAt !== undefined) {
        previousInv = await prisma_1.prisma.storeInventory.findUnique({
            where: { storeId_productId: { storeId: resolvedStoreId, productId: id } },
        });
    }
    const [product] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.bizProduct.update({ where: { id }, data: productData }),
        ...(stock !== undefined || lowStockAt !== undefined
            ? [
                prisma_1.prisma.storeInventory.upsert({
                    where: { storeId_productId: { storeId: resolvedStoreId, productId: id } },
                    update: { ...(stock !== undefined && { stock }), ...(lowStockAt !== undefined && { lowStockAt }) },
                    create: { storeId: resolvedStoreId, productId: id, stock: stock ?? 0, lowStockAt: lowStockAt ?? 3 },
                }),
            ]
            : []),
    ]);
    const inv = await prisma_1.prisma.storeInventory.findUnique({ where: { storeId_productId: { storeId: resolvedStoreId, productId: id } } });
    if (inv && previousInv) {
        const wasAbove = previousInv.stock > previousInv.lowStockAt;
        const nowAtOrBelow = inv.stock <= inv.lowStockAt;
        if (wasAbove && nowAtOrBelow) {
            const profile = await getOrCreateProfile(userId);
            if (profile.notifyLowStock) {
                const store = await prisma_1.prisma.store.findUnique({ where: { id: resolvedStoreId }, select: { name: true } });
                const storeLabel = store?.name ? ` at ${store.name}` : "";
                await (0, notification_service_1.createNotification)(userId, {
                    type: "ALERT",
                    title: "Low stock alert",
                    message: `${product.name} is running low${storeLabel} — ${inv.stock} left`,
                    actionUrl: "/merchant/products",
                });
            }
        }
    }
    return serializeProduct(product, inv ? { stock: inv.stock, lowStockAt: inv.lowStockAt } : undefined);
}
async function deleteProduct(userId, id) {
    const existing = await prisma_1.prisma.bizProduct.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Product not found", 404);
    await prisma_1.prisma.bizProduct.update({ where: { id }, data: { active: false } });
}
async function getProductByBarcode(userId, barcode, storeId) {
    const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
    const product = await prisma_1.prisma.bizProduct.findFirst({
        where: { userId, barcode, active: true },
        include: { storeInventory: { where: { storeId: resolvedStoreId } } },
    });
    if (!product)
        throw new errors_1.AppError("No product found for this barcode", 404);
    const inv = product.storeInventory[0];
    return serializeProduct(product, inv ? { stock: inv.stock, lowStockAt: inv.lowStockAt } : { stock: 0, lowStockAt: product.lowStockAt });
}
// ── Customers ───────────────────────────────────────────────────────────
async function listCustomers(userId) {
    const customers = await prisma_1.prisma.bizCustomer.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { sales: { select: { total: true, status: true, createdAt: true } } },
    });
    return customers.map((c) => {
        const paid = c.sales.filter((s) => s.status === "PAID");
        const totalSpent = paid.reduce((sum, s) => sum + num(s.total), 0);
        const lastOrderAt = paid.length > 0
            ? paid.reduce((latest, s) => (s.createdAt > latest ? s.createdAt : latest), paid[0].createdAt).toISOString()
            : null;
        return serializeCustomer(c, totalSpent, paid.length, lastOrderAt);
    });
}
async function createCustomer(userId, data) {
    const customer = await prisma_1.prisma.bizCustomer.create({ data: { ...data, userId } });
    return serializeCustomer(customer);
}
async function updateCustomer(userId, id, data) {
    const existing = await prisma_1.prisma.bizCustomer.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Customer not found", 404);
    const customer = await prisma_1.prisma.bizCustomer.update({ where: { id }, data });
    const sales = await prisma_1.prisma.bizSale.findMany({
        where: { customerId: id, status: "PAID" },
        select: { total: true, createdAt: true },
    });
    const totalSpent = sales.reduce((sum, s) => sum + num(s.total), 0);
    const lastOrderAt = sales.length > 0
        ? sales.reduce((latest, s) => (s.createdAt > latest ? s.createdAt : latest), sales[0].createdAt).toISOString()
        : null;
    return serializeCustomer(customer, totalSpent, sales.length, lastOrderAt);
}
// ── Sales (POS checkout) ────────────────────────────────────────────────
async function createSale(userId, data, storeId) {
    const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
    const profile = await getOrCreateProfile(userId);
    const status = data.status ?? "PAID";
    const subtotal = data.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const manualDiscount = data.discount ?? 0;
    let pointsToRedeem = 0;
    const lowStockCrossings = [];
    const sale = await prisma_1.prisma.$transaction(async (tx) => {
        let customer = null;
        if (data.customerId) {
            customer = await tx.bizCustomer.findFirst({ where: { id: data.customerId, userId } });
            if (!customer)
                throw new errors_1.AppError("Customer not found", 404);
        }
        let redemptionDiscount = 0;
        if (profile.loyaltyEnabled && data.redeemPoints && data.redeemPoints > 0) {
            if (status !== "PAID")
                throw new errors_1.AppError("Points can only be redeemed on a paid sale", 400);
            if (!customer)
                throw new errors_1.AppError("Select a customer to redeem loyalty points", 400);
            if (customer.loyaltyPoints < data.redeemPoints) {
                throw new errors_1.AppError(`${customer.name} only has ${customer.loyaltyPoints} points available`, 400);
            }
            pointsToRedeem = data.redeemPoints;
            redemptionDiscount = pointsToRedeem * profile.loyaltyRedemptionValue;
        }
        const totalDiscount = Math.min(subtotal, manualDiscount + redemptionDiscount);
        const total = Math.max(0, subtotal - totalDiscount);
        for (const it of data.items) {
            if (!it.productId)
                continue;
            const inv = await tx.storeInventory.findUnique({
                where: { storeId_productId: { storeId: resolvedStoreId, productId: it.productId } },
                include: { product: { select: { name: true } } },
            });
            if (!inv)
                continue;
            if (inv.stock < it.quantity) {
                throw new errors_1.AppError(`Not enough stock for "${inv.product.name}" (${inv.stock} left)`, 400);
            }
            const nextStock = inv.stock - it.quantity;
            await tx.storeInventory.update({
                where: { storeId_productId: { storeId: resolvedStoreId, productId: it.productId } },
                data: { stock: { decrement: it.quantity } },
            });
            if (inv.stock > inv.lowStockAt && nextStock <= inv.lowStockAt) {
                lowStockCrossings.push({ productName: inv.product.name, remaining: nextStock });
            }
        }
        const created = await tx.bizSale.create({
            data: {
                userId,
                storeId: resolvedStoreId,
                customerId: data.customerId,
                receiptNumber: genReceiptNumber(),
                subtotal,
                discount: totalDiscount,
                total,
                paymentMethod: data.paymentMethod ?? "CASH",
                status,
                note: data.note,
                items: {
                    create: data.items.map((it) => ({
                        productId: it.productId,
                        name: it.name,
                        quantity: it.quantity,
                        unitPrice: it.unitPrice,
                        lineTotal: it.quantity * it.unitPrice,
                    })),
                },
            },
            include: { items: true, customer: true, store: true },
        });
        if (customer && status === "PAID") {
            const pointsEarned = profile.loyaltyEnabled ? Math.floor(total / 100) * profile.loyaltyEarnRate : 0;
            const netChange = pointsEarned - pointsToRedeem;
            if (netChange !== 0) {
                await tx.bizCustomer.update({ where: { id: customer.id }, data: { loyaltyPoints: { increment: netChange } } });
            }
        }
        return created;
    });
    if (profile.notifyLowStock && lowStockCrossings.length > 0) {
        const storeLabel = sale.store?.name ? ` at ${sale.store.name}` : "";
        for (const c of lowStockCrossings) {
            await (0, notification_service_1.createNotification)(userId, {
                type: "ALERT",
                title: "Low stock alert",
                message: `${c.productName} is running low${storeLabel} — ${c.remaining} left`,
                actionUrl: "/merchant/products",
            });
        }
    }
    return serializeSale(sale);
}
async function listSales(userId, range = "month", storeId) {
    const sales = await prisma_1.prisma.bizSale.findMany({
        where: { userId, createdAt: { gte: rangeStart(range) }, ...(storeId ? { storeId } : {}) },
        include: { items: true, customer: true, store: true },
        orderBy: { createdAt: "desc" },
    });
    return sales.map(serializeSale);
}
async function updateSaleStatus(userId, id, status) {
    const existing = await prisma_1.prisma.bizSale.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Sale not found", 404);
    const sale = await prisma_1.prisma.bizSale.update({
        where: { id },
        data: { status: status },
        include: { items: true, customer: true },
    });
    return serializeSale(sale);
}
// ── Expenses ────────────────────────────────────────────────────────────
async function listExpenses(userId, range = "month", storeId) {
    const expenses = await prisma_1.prisma.bizExpense.findMany({
        where: { userId, date: { gte: rangeStart(range) }, ...(storeId ? { storeId } : {}) },
        orderBy: { date: "desc" },
    });
    return expenses.map(serializeExpense);
}
async function createExpense(userId, data, storeId) {
    const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
    const expense = await prisma_1.prisma.bizExpense.create({
        data: { ...data, userId, storeId: resolvedStoreId, date: data.date ? new Date(data.date) : new Date() },
    });
    return serializeExpense(expense);
}
async function deleteExpense(userId, id) {
    const existing = await prisma_1.prisma.bizExpense.findFirst({ where: { id, userId } });
    if (!existing)
        throw new errors_1.AppError("Expense not found", 404);
    await prisma_1.prisma.bizExpense.delete({ where: { id } });
}
// ── Dashboard ───────────────────────────────────────────────────────────
function resolveRange(params) {
    if (params.from) {
        const start = new Date(params.from);
        const end = params.to ? new Date(params.to) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
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
        case "month":
            return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
        case "year":
            return { start: new Date(now.getFullYear(), 0, 1), end };
        case "today":
        default:
            return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end };
    }
}
async function getDashboard(userId, params, storeId) {
    const profile = await getOrCreateProfile(userId);
    const { start, end } = resolveRange(params);
    const windowMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - windowMs);
    const storeFilter = storeId ? { storeId } : {};
    const [sales, prevSales, customers, expenses] = await Promise.all([
        prisma_1.prisma.bizSale.findMany({ where: { userId, createdAt: { gte: start, lt: end }, status: "PAID", ...storeFilter }, include: { items: true, customer: true } }),
        prisma_1.prisma.bizSale.findMany({ where: { userId, status: "PAID", createdAt: { gte: prevStart, lt: start }, ...storeFilter } }),
        prisma_1.prisma.bizCustomer.count({ where: { userId } }),
        prisma_1.prisma.bizExpense.findMany({ where: { userId, date: { gte: start, lt: end }, ...storeFilter } }),
    ]);
    const revenue = sales.reduce((sum, s) => sum + num(s.total), 0);
    const prevRevenue = prevSales.reduce((sum, s) => sum + num(s.total), 0);
    const revenueChange = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;
    const totalExpenses = expenses.reduce((sum, e) => sum + num(e.amount), 0);
    const lowStockRows = await prisma_1.prisma.storeInventory.findMany({
        where: { product: { userId, active: true }, ...(storeId ? { storeId } : {}) },
        include: { product: true, store: true },
    });
    const lowStock = lowStockRows.filter((r) => r.stock <= r.lowStockAt);
    const unitsByProduct = new Map();
    for (const s of sales) {
        for (const it of s.items) {
            const key = it.productId ?? it.name;
            const cur = unitsByProduct.get(key) ?? { name: it.name, units: 0, revenue: 0 };
            cur.units += it.quantity;
            cur.revenue += num(it.lineTotal);
            unitsByProduct.set(key, cur);
        }
    }
    const topProducts = [...unitsByProduct.values()].sort((a, b) => b.units - a.units).slice(0, 5);
    const metrics = [
        { id: "revenue", label: "Revenue", value: `${profile.currency} ${revenue.toLocaleString()}`, change: revenueChange == null ? undefined : `${revenueChange >= 0 ? "+" : ""}${revenueChange}% vs prior period` },
        { id: "orders", label: "Orders", value: `${sales.length}`, change: undefined },
        { id: "customers", label: "Customers", value: `${customers}`, change: undefined },
        { id: "profit", label: "Net (rev - exp)", value: `${profile.currency} ${(revenue - totalExpenses).toLocaleString()}`, change: undefined },
    ];
    const recentActivity = [
        ...sales.slice(0, 8).map((s) => ({ id: s.id, title: s.customer?.name ? `Sale to ${s.customer.name}` : `Sale ${s.receiptNumber}`, type: "order", amount: num(s.total), currency: profile.currency, date: s.createdAt.toISOString(), status: s.status })),
        ...expenses.slice(0, 5).map((e) => ({ id: e.id, title: e.title, type: "expense", amount: num(e.amount), currency: profile.currency, date: e.date.toISOString(), status: undefined })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    let insight = "Log a few sales to start seeing trends here.";
    if (sales.length > 0) {
        if (lowStock.length > 0) {
            insight = `${lowStock.length} product${lowStock.length > 1 ? "s are" : " is"} running low on stock — ${lowStock.slice(0, 3).map((r) => r.product.name).join(", ")}.`;
        }
        else if (topProducts[0]) {
            insight = `"${topProducts[0].name}" is your top seller this period with ${topProducts[0].units} units sold.`;
        }
        else if (revenueChange != null) {
            insight = `Revenue is ${revenueChange >= 0 ? "up" : "down"} ${Math.abs(revenueChange)}% versus the prior period.`;
        }
    }
    return {
        businessName: profile.businessName,
        currency: profile.currency,
        metrics,
        recentActivity,
        topProducts,
        lowStockCount: lowStock.length,
        lowStockProducts: lowStock.slice(0, 5).map((r) => ({
            ...serializeProduct(r.product, { stock: r.stock, lowStockAt: r.lowStockAt }),
            storeName: storeId ? undefined : r.store?.name,
        })),
        totalExpenses,
        insight,
    };
}
async function listProductsPaged(userId, opts = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const resolvedStoreId = await storeService.resolveStoreId(userId, opts.storeId);
    const where = { userId, ...(opts.activeOnly ? { active: true } : {}) };
    if (opts.search) {
        where.OR = [
            { name: { contains: opts.search, mode: "insensitive" } },
            { sku: { contains: opts.search, mode: "insensitive" } },
        ];
    }
    const [products, total] = await Promise.all([
        prisma_1.prisma.bizProduct.findMany({
            where,
            include: { storeInventory: { where: { storeId: resolvedStoreId } } },
            orderBy: [{ active: "desc" }, { name: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma_1.prisma.bizProduct.count({ where }),
    ]);
    return {
        products: products.map((p) => {
            const inv = p.storeInventory[0];
            return serializeProduct(p, inv ? { stock: inv.stock, lowStockAt: inv.lowStockAt } : { stock: 0, lowStockAt: p.lowStockAt });
        }),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
}
async function bulkImportProducts(userId, products, storeId) {
    const profile = await getOrCreateProfile(userId);
    const resolvedStoreId = await storeService.resolveStoreId(userId, storeId);
    const allStores = await prisma_1.prisma.store.findMany({ where: { bizProfileId: profile.id, active: true } });
    const results = { successful: 0, failed: 0, errors: [] };
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        try {
            if (!product.name || !product.price)
                throw new Error("Missing required fields (name, price)");
            const price = parseFloat(product.price);
            const stock = product.stock ? parseInt(product.stock) : 0;
            const cost = product.cost ? parseFloat(product.cost) : undefined;
            if (isNaN(price) || price <= 0)
                throw new Error("Invalid price value");
            if (isNaN(stock) || stock < 0)
                throw new Error("Invalid stock value");
            if (product.barcode) {
                const existing = await prisma_1.prisma.bizProduct.findFirst({ where: { userId, barcode: product.barcode } });
                if (existing)
                    throw new Error("Barcode already exists");
            }
            const lowStockAt = product.lowStockAt ? parseInt(product.lowStockAt) : 3;
            await prisma_1.prisma.$transaction(async (tx) => {
                const created = await tx.bizProduct.create({
                    data: {
                        userId, name: product.name, price, cost,
                        barcode: product.barcode || undefined,
                        sku: product.sku || undefined,
                        category: product.category || undefined,
                        lowStockAt, active: true,
                    },
                });
                await tx.storeInventory.createMany({
                    data: allStores.map((s) => ({
                        storeId: s.id,
                        productId: created.id,
                        stock: s.id === resolvedStoreId ? stock : 0,
                        lowStockAt,
                    })),
                });
            });
            results.successful++;
        }
        catch (error) {
            results.failed++;
            results.errors.push({ row: i + 1, name: product.name || "Unknown", error: error.message });
        }
    }
    return results;
}
async function exportProductsCSV(userId, opts = {}) {
    const products = await listProducts(userId, opts.activeOnly ?? false, opts.storeId);
    return (0, csv_1.toCSV)(products, [
        { key: "name", label: "Name" },
        { key: "sku", label: "SKU" },
        { key: "barcode", label: "Barcode" },
        { key: "category", label: "Category" },
        { key: "price", label: "Price" },
        { key: "cost", label: "Cost" },
        { key: "stock", label: "Stock" },
        { key: "lowStockAt", label: "Low Stock At" },
        { key: "margin", label: "Margin %" },
        { key: "active", label: "Active" },
    ]);
}
async function exportSalesCSV(userId, opts = {}) {
    const sales = await listSales(userId, opts.range ?? "month", opts.storeId);
    return (0, csv_1.toCSV)(sales, [
        { key: "receiptNumber", label: "Receipt #" },
        { key: "createdAt", label: "Date", value: (s) => new Date(s.createdAt).toISOString() },
        { key: "customerName", label: "Customer", value: (s) => s.customerName ?? "Walk-in" },
        { key: "storeName", label: "Store", value: (s) => s.storeName ?? "" },
        { key: "subtotal", label: "Subtotal" },
        { key: "discount", label: "Discount" },
        { key: "total", label: "Total" },
        { key: "paymentMethod", label: "Payment Method" },
        { key: "status", label: "Status" },
        { key: "itemCount", label: "Item Count", value: (s) => s.items.length },
    ]);
}
async function exportCustomersCSV(userId) {
    const customers = await listCustomers(userId);
    return (0, csv_1.toCSV)(customers, [
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "totalSpent", label: "Total Spent" },
        { key: "orderCount", label: "Order Count" },
        { key: "loyaltyPoints", label: "Loyalty Points" },
        { key: "createdAt", label: "Customer Since", value: (c) => new Date(c.createdAt).toISOString() },
    ]);
}
