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
exports.getApplicationStatus = getApplicationStatus;
exports.applyAsMerchant = applyAsMerchant;
exports.uploadIdDocument = uploadIdDocument;
exports.markIdVerified = markIdVerified;
exports.createMerchantCheckout = createMerchantCheckout;
exports.createMerchantPortalSession = createMerchantPortalSession;
exports.listApplications = listApplications;
exports.reviewApplication = reviewApplication;
exports.changeMerchantStatus = changeMerchantStatus;
exports.getApplicationDetail = getApplicationDetail;
exports.regenerateStoreCode = regenerateStoreCode;
exports.forceStaffLogout = forceStaffLogout;
exports.updateNotificationSettings = updateNotificationSettings;
exports.setPaused = setPaused;
const cloudinary_1 = require("../config/cloudinary");
const env_1 = require("../config/env");
const crypto_1 = __importDefault(require("crypto"));
const plan_1 = require("../config/plan");
const prisma_1 = require("../config/prisma");
const errors_1 = require("../lib/errors");
const paystack = __importStar(require("./paystack.service"));
const notification_service_1 = require("./notification.service");
const audit_service_1 = require("./audit.service");
const email_service_1 = require("./email.service");
async function getApplicationStatus(userId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile)
        return { status: "NONE" };
    const billingInterval = profile.billingInterval;
    return {
        status: profile.status,
        businessName: profile.businessName,
        category: profile.category,
        appliedAt: profile.appliedAt.toISOString(),
        reviewedAt: profile.reviewedAt?.toISOString(),
        rejectionReason: profile.rejectionReason,
        idVerifiedAt: profile.idVerifiedAt?.toISOString(),
        planTier: profile.planTier,
        planStatus: profile.planStatus,
        billingInterval,
        currentPeriodEnd: profile.currentPeriodEnd?.toISOString(),
    };
}
async function applyAsMerchant(userId, data) {
    const existing = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (existing) {
        if (existing.status === "APPROVED")
            throw new errors_1.AppError("You're already an approved merchant", 409);
        if (existing.status === "PENDING")
            throw new errors_1.AppError("Your merchant application is already under review", 409);
        if (existing.status === "SUSPENDED")
            throw new errors_1.AppError("Your merchant account is suspended. Contact support.", 403);
        return prisma_1.prisma.bizProfile.update({
            where: { userId },
            data: {
                businessName: data.businessName,
                category: data.category,
                description: data.description,
                contactPhone: data.contactPhone,
                contactEmail: data.contactEmail,
                address: data.address,
                currency: data.currency ?? "USD",
                idDocumentType: data.idDocumentType,
                idDocumentNumber: data.idDocumentNumber,
                idFrontUrl: data.idFrontUrl,
                idBackUrl: data.idBackUrl,
                status: "PENDING",
                appliedAt: new Date(),
                reviewedAt: null,
                reviewedBy: null,
                rejectionReason: null,
                idVerifiedAt: null,
            },
        });
    }
    return prisma_1.prisma.bizProfile.create({
        data: {
            userId,
            businessName: data.businessName,
            category: data.category,
            description: data.description,
            contactPhone: data.contactPhone,
            contactEmail: data.contactEmail,
            address: data.address,
            currency: data.currency ?? "USD",
            idDocumentType: data.idDocumentType,
            idDocumentNumber: data.idDocumentNumber,
            idFrontUrl: data.idFrontUrl,
            idBackUrl: data.idBackUrl,
            status: "PENDING",
        },
    });
}
async function uploadIdDocument(buffer) {
    const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary_1.cloudinary.uploader.upload_stream({ folder: "lifeos/merchant-id-docs", resource_type: "auto" }, (err, result) => (err || !result ? reject(err) : resolve(result)));
        stream.end(buffer);
    });
    return { url: uploaded.secure_url };
}
async function markIdVerified(reviewerId, bizProfileId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { id: bizProfileId } });
    if (!profile)
        throw new errors_1.AppError("Merchant not found", 404);
    const updated = await prisma_1.prisma.bizProfile.update({ where: { id: bizProfileId }, data: { idVerifiedAt: new Date() } });
    await (0, audit_service_1.logAdminAction)(reviewerId, "MERCHANT_ID_VERIFIED", "BizProfile", bizProfileId, `Verified ID for ${updated.businessName}`);
    return updated;
}
async function createMerchantCheckout(userId, email, planKey, interval = "month") {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile)
        throw new errors_1.AppError("Apply as a merchant first", 404);
    if (profile.status !== "APPROVED")
        throw new errors_1.AppError("Your application must be approved before choosing a plan", 403);
    const plan = plan_1.MERCHANT_PLANS[planKey];
    if (!plan)
        throw new errors_1.AppError("Invalid plan", 400);
    const planCode = interval === "year" ? plan.planCodeYearly : plan.planCodeMonthly;
    if (!planCode)
        throw new errors_1.AppError("This plan isn't available for that billing interval", 400);
    const result = await paystack.initializeTransaction({
        email,
        plan: planCode,
        callback_url: `${env_1.env.FRONTEND_URL}/merchant/dashboard?merchantPlanActive=true`,
        metadata: { userId, type: "merchant" },
    });
    return result.authorization_url;
}
async function createMerchantPortalSession(userId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile?.paystackSubscriptionCode)
        throw new errors_1.AppError("No merchant billing account found", 400);
    const result = await paystack.getSubscriptionManageLink(profile.paystackSubscriptionCode);
    return result.link;
}
// ─── Admin review ──────────────────────────────────────────────────────────
async function listApplications(status) {
    return prisma_1.prisma.bizProfile.findMany({
        where: status ? { status } : undefined,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { appliedAt: "desc" },
    });
}
async function reviewApplication(reviewerId, bizProfileId, action, rejectionReason) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { id: bizProfileId } });
    if (!profile)
        throw new errors_1.AppError("Application not found", 404);
    if (profile.status !== "PENDING")
        throw new errors_1.AppError("This application has already been reviewed", 409);
    return prisma_1.prisma.bizProfile.update({
        where: { id: bizProfileId },
        data: {
            status: action === "APPROVE" ? "APPROVED" : "REJECTED",
            reviewedAt: new Date(),
            reviewedBy: reviewerId,
            rejectionReason: action === "REJECT" ? rejectionReason ?? "Not specified" : null,
        },
    });
}
async function changeMerchantStatus(reviewerId, bizProfileId, action, reason) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { id: bizProfileId } });
    if (!profile)
        throw new errors_1.AppError("Merchant not found", 404);
    if (action === "APPROVE") {
        if (profile.status !== "PENDING")
            throw new errors_1.AppError("Only pending applications can be approved", 409);
        const updated = await prisma_1.prisma.bizProfile.update({
            where: { id: bizProfileId },
            data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: reviewerId, rejectionReason: null },
        });
        await (0, audit_service_1.logAdminAction)(reviewerId, "MERCHANT_APPROVED", "BizProfile", bizProfileId, `Approved ${updated.businessName}`);
        await (0, notification_service_1.createNotification)(updated.userId, { type: "MERCHANT", title: "You're approved!", message: `${updated.businessName} was approved. Choose a plan to activate your dashboard.`, actionUrl: "/merchant/billing" });
        const owner = await prisma_1.prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true } });
        if (owner)
            await (0, email_service_1.sendMerchantApprovedEmail)(owner.email, updated.businessName);
        return updated;
    }
    if (action === "REJECT") {
        if (profile.status !== "PENDING")
            throw new errors_1.AppError("Only pending applications can be rejected", 409);
        const updated = await prisma_1.prisma.bizProfile.update({
            where: { id: bizProfileId },
            data: { status: "REJECTED", reviewedAt: new Date(), reviewedBy: reviewerId, rejectionReason: reason ?? "Not specified" },
        });
        await (0, audit_service_1.logAdminAction)(reviewerId, "MERCHANT_REJECTED", "BizProfile", bizProfileId, `Rejected ${updated.businessName}`);
        await (0, notification_service_1.createNotification)(updated.userId, { type: "MERCHANT", title: "Application not approved", message: reason ?? "Your merchant application was not approved.", actionUrl: "/merchant/apply" });
        const owner = await prisma_1.prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true } });
        if (owner)
            await (0, email_service_1.sendMerchantRejectedEmail)(owner.email, updated.businessName, reason);
        return updated;
    }
    if (action === "SUSPEND") {
        if (profile.status !== "APPROVED")
            throw new errors_1.AppError("Only approved merchants can be suspended", 409);
        const updated = await prisma_1.prisma.bizProfile.update({
            where: { id: bizProfileId },
            data: { status: "SUSPENDED", reviewedAt: new Date(), reviewedBy: reviewerId, rejectionReason: reason ?? "Suspended by admin" },
        });
        await (0, audit_service_1.logAdminAction)(reviewerId, "MERCHANT_SUSPENDED", "BizProfile", bizProfileId, `Suspended ${updated.businessName}`);
        await (0, notification_service_1.createNotification)(updated.userId, { type: "ALERT", title: "Merchant account suspended", message: reason ?? "Your merchant account has been suspended." });
        const owner = await prisma_1.prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true } });
        if (owner)
            await (0, email_service_1.sendMerchantSuspendedEmail)(owner.email, updated.businessName, reason);
        return updated;
    }
    if (action === "REACTIVATE") {
        if (profile.status !== "SUSPENDED")
            throw new errors_1.AppError("Only suspended merchants can be reactivated", 409);
        const updated = await prisma_1.prisma.bizProfile.update({
            where: { id: bizProfileId },
            data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: reviewerId, rejectionReason: null },
        });
        await (0, audit_service_1.logAdminAction)(reviewerId, "MERCHANT_REACTIVATED", "BizProfile", bizProfileId, `Reactivated ${updated.businessName}`);
        await (0, notification_service_1.createNotification)(updated.userId, { type: "SUCCESS", title: "Merchant account reactivated", message: "Your merchant account is active again." });
        const owner = await prisma_1.prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true } });
        if (owner)
            await (0, email_service_1.sendMerchantReactivatedEmail)(owner.email, updated.businessName);
        return updated;
    }
    throw new errors_1.AppError("Invalid action", 400);
}
async function getApplicationDetail(bizProfileId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({
        where: { id: bizProfileId },
        include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    });
    if (!profile)
        throw new errors_1.AppError("Merchant not found", 404);
    const staffCount = await prisma_1.prisma.bizStaff.count({ where: { bizProfileId } });
    return { ...profile, staffCount };
}
async function regenerateStoreCode(userId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    const newCode = crypto_1.default.randomBytes(4).toString("hex").toUpperCase();
    return prisma_1.prisma.bizProfile.update({ where: { id: profile.id }, data: { staffLoginCode: newCode } });
}
async function forceStaffLogout(userId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile)
        throw new errors_1.AppError("Merchant profile not found", 404);
    return prisma_1.prisma.bizProfile.update({ where: { id: profile.id }, data: { staffTokenVersion: { increment: 1 } } });
}
async function updateNotificationSettings(userId, data) {
    return prisma_1.prisma.bizProfile.update({ where: { userId }, data });
}
async function setPaused(userId, paused) {
    return prisma_1.prisma.bizProfile.update({ where: { userId }, data: { paused } });
}
