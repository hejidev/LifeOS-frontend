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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPaused = exports.updateNotificationSettings = exports.forceStaffLogout = exports.regenerateStoreCode = exports.getStaffLoginCode = exports.verifyId = exports.portal = exports.checkout = exports.uploadIdDocument = exports.getApplicationDetail = exports.reviewApplication = exports.listApplications = exports.apply = exports.getStatus = void 0;
const errors_1 = require("../lib/errors");
const merchantService = __importStar(require("../services/merchant.service"));
const prisma_1 = require("../config/prisma");
const crypto_1 = __importDefault(require("crypto"));
exports.getStatus = (0, errors_1.asyncHandler)(async (req, res) => {
    const status = await merchantService.getApplicationStatus(req.user.id);
    return res.json(status);
});
exports.apply = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await merchantService.applyAsMerchant(req.user.id, req.body);
    return res.status(201).json({ profile });
});
exports.listApplications = (0, errors_1.asyncHandler)(async (req, res) => {
    const status = req.query.status;
    const applications = await merchantService.listApplications(status);
    return res.json({ applications });
});
exports.reviewApplication = (0, errors_1.asyncHandler)(async (req, res) => {
    const { action, rejectionReason } = req.body;
    const profile = await merchantService.changeMerchantStatus(req.user.id, req.params.id, action, rejectionReason);
    return res.json({ profile });
});
exports.getApplicationDetail = (0, errors_1.asyncHandler)(async (req, res) => {
    const detail = await merchantService.getApplicationDetail(req.params.id);
    return res.json({ detail });
});
exports.uploadIdDocument = (0, errors_1.asyncHandler)(async (req, res) => {
    const file = req.file;
    if (!file)
        throw new errors_1.AppError("No file uploaded", 400);
    const result = await merchantService.uploadIdDocument(file.buffer);
    return res.status(201).json(result);
});
exports.checkout = (0, errors_1.asyncHandler)(async (req, res) => {
    const url = await merchantService.createMerchantCheckout(req.user.id, req.user.email, req.body.plan, req.body.interval ?? "month");
    return res.json({ url });
});
exports.portal = (0, errors_1.asyncHandler)(async (req, res) => {
    const url = await merchantService.createMerchantPortalSession(req.user.id);
    return res.json({ url });
});
exports.verifyId = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await merchantService.markIdVerified(req.user.id, req.params.id);
    return res.json({ profile });
});
exports.getStaffLoginCode = (0, errors_1.asyncHandler)(async (req, res) => {
    let profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    if (!profile.staffLoginCode) {
        profile = await prisma_1.prisma.bizProfile.update({
            where: { id: profile.id },
            data: { staffLoginCode: crypto_1.default.randomBytes(4).toString("hex").toUpperCase() },
        });
    }
    return res.json({ storeCode: profile.staffLoginCode });
});
exports.regenerateStoreCode = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await merchantService.regenerateStoreCode(req.user.id);
    return res.json({ storeCode: profile.staffLoginCode });
});
exports.forceStaffLogout = (0, errors_1.asyncHandler)(async (req, res) => {
    await merchantService.forceStaffLogout(req.user.id);
    return res.status(204).send();
});
exports.updateNotificationSettings = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await merchantService.updateNotificationSettings(req.user.id, req.body);
    return res.json({ profile });
});
exports.setPaused = (0, errors_1.asyncHandler)(async (req, res) => {
    const profile = await merchantService.setPaused(req.user.id, req.body.paused);
    return res.json({ profile });
});
