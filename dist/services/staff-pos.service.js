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
exports.getProducts = getProducts;
exports.getCustomers = getCustomers;
exports.createCustomer = createCustomer;
exports.getProductByBarcode = getProductByBarcode;
exports.createSale = createSale;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const businessService = __importStar(require("./business.service"));
const staffPortalService = __importStar(require("./staff-portal.service"));
const MAX_OFFLINE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
async function resolveOwner(bizProfileId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({
        where: { id: bizProfileId },
        select: { userId: true, currency: true, paused: true },
    });
    if (!profile)
        throw new errors_1.AppError("Store not found", 404);
    if (profile.paused)
        throw new errors_1.AppError("This store is currently paused", 403);
    return profile;
}
function toStaffProduct(product) {
    const { cost: _cost, margin: _margin, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = product;
    return rest;
}
async function getProducts(bizProfileId, storeId) {
    const { userId } = await resolveOwner(bizProfileId);
    const products = await businessService.listProducts(userId, true, storeId);
    return products.map(toStaffProduct);
}
async function getCustomers(bizProfileId) {
    const { userId } = await resolveOwner(bizProfileId);
    return businessService.listCustomers(userId);
}
async function createCustomer(bizProfileId, data) {
    const { userId } = await resolveOwner(bizProfileId);
    return businessService.createCustomer(userId, data);
}
async function getProductByBarcode(bizProfileId, storeId, barcode) {
    const { userId } = await resolveOwner(bizProfileId);
    const product = await businessService.getProductByBarcode(userId, barcode, storeId);
    return toStaffProduct(product);
}
async function createSale(staffId, bizProfileId, storeId, data) {
    const { userId, currency } = await resolveOwner(bizProfileId);
    const { discount: _discount, items, clientRequestId, receiptNumber, soldAt, offline, staffId: claimedStaffId, ...saleData } = data;
    const isOffline = offline === true;
    if (clientRequestId) {
        const existing = await businessService.findSaleByRequestId(userId, clientRequestId);
        if (existing)
            return existing;
    }
    const productIds = items.map((item) => item.productId).filter(Boolean);
    if (productIds.length !== items.length) {
        throw new errors_1.AppError("Every item must be a product from the catalog", 400);
    }
    const products = await prisma_1.prisma.bizProduct.findMany({
        where: { id: { in: productIds }, userId },
        select: { id: true, name: true, price: true, active: true },
    });
    const catalog = new Map(products.map((product) => [product.id, product]));
    const reviewNotes = [];
    const pricedItems = items.map((item) => {
        const product = catalog.get(item.productId);
        if (!product || (!isOffline && !product.active)) {
            throw new errors_1.AppError("One of the items is no longer available", 400);
        }
        const catalogPrice = Number(product.price);
        if (!isOffline) {
            return { productId: product.id, name: product.name, quantity: item.quantity, unitPrice: catalogPrice };
        }
        if (Math.abs(item.unitPrice - catalogPrice) > 0.009) {
            reviewNotes.push(`${product.name}: sold at ${currency} ${item.unitPrice}, catalog price is ${currency} ${catalogPrice}`);
        }
        return { productId: product.id, name: product.name, quantity: item.quantity, unitPrice: item.unitPrice };
    });
    let soldAtDate;
    let actingStaffId = staffId;
    if (isOffline) {
        const parsed = soldAt ? new Date(soldAt) : new Date();
        const now = Date.now();
        if (Number.isNaN(parsed.getTime()))
            throw new errors_1.AppError("Invalid sale time", 400);
        if (now - parsed.getTime() > MAX_OFFLINE_AGE_MS) {
            throw new errors_1.AppError("This offline sale is too old to import automatically", 400);
        }
        soldAtDate = parsed.getTime() > now ? new Date(now) : parsed;
        if (claimedStaffId && claimedStaffId !== staffId) {
            const colleague = await prisma_1.prisma.bizStaff.findFirst({
                where: { id: claimedStaffId, bizProfileId, storeId },
                select: { id: true },
            });
            if (colleague)
                actingStaffId = colleague.id;
        }
    }
    let sale;
    try {
        sale = await businessService.createSale(userId, {
            ...saleData,
            items: pricedItems,
            discount: 0,
            status: "PAID",
            clientRequestId,
            receiptNumber,
            soldAt: soldAtDate,
            offline: isOffline,
            reviewNotes,
        }, storeId);
    }
    catch (err) {
        if (err?.code === "P2002" && clientRequestId) {
            const existing = await businessService.findSaleByRequestId(userId, clientRequestId);
            if (existing)
                return existing;
        }
        throw err;
    }
    const description = `Rang up sale ${sale.receiptNumber} — ${currency} ${sale.total.toLocaleString()}`;
    if (isOffline) {
        await prisma_1.prisma.bizStaffActivity.create({
            data: {
                staffId: actingStaffId,
                bizProfileId,
                action: "SALE_CREATED",
                description: `${description} (sold offline)`,
                createdAt: soldAtDate,
            },
        });
    }
    else {
        await staffPortalService.logSelfActivity(staffId, bizProfileId, "SALE_CREATED", description);
    }
    return sale;
}
