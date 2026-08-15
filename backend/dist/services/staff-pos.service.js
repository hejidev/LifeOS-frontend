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
exports.createSale = createSale;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const businessService = __importStar(require("./business.service"));
const staffPortalService = __importStar(require("./staff-portal.service"));
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
async function getProducts(bizProfileId) {
    const { userId } = await resolveOwner(bizProfileId);
    return businessService.listProducts(userId, true);
}
async function getCustomers(bizProfileId) {
    const { userId } = await resolveOwner(bizProfileId);
    return businessService.listCustomers(userId);
}
async function createCustomer(bizProfileId, data) {
    const { userId } = await resolveOwner(bizProfileId);
    return businessService.createCustomer(userId, data);
}
async function createSale(staffId, bizProfileId, data) {
    const { userId, currency } = await resolveOwner(bizProfileId);
    const { discount: _ignored, ...saleData } = data;
    const sale = await businessService.createSale(userId, { ...saleData, discount: 0 });
    await staffPortalService.logSelfActivity(staffId, bizProfileId, "SALE_CREATED", `Rang up sale ${sale.receiptNumber} — ${currency} ${sale.total.toLocaleString()}`);
    return sale;
}
