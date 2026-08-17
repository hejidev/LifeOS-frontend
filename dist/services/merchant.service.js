"use strict";
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
const billing_service_1 = require("./billing.service");
const notification_service_1 = require("./notification.service");
const audit_service_1 = require("./audit.service");
async function getApplicationStatus(userId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile)
        return { status: "NONE" };
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
    const priceId = interval === "year" ? plan.priceIdYearly : plan.priceIdMonthly;
    if (!priceId)
        throw new errors_1.AppError("This plan isn't available for that billing interval", 400);
    let customerId = profile.stripeCustomerId;
    if (!customerId) {
        const customer = await billing_service_1.stripe.customers.create({ email, metadata: { userId, type: "merchant" } });
        customerId = customer.id;
        await prisma_1.prisma.bizProfile.update({ where: { userId }, data: { stripeCustomerId: customerId } });
    }
    const session = await billing_service_1.stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${env_1.env.FRONTEND_URL}/merchant/dashboard?merchantPlanActive=true`,
        cancel_url: `${env_1.env.FRONTEND_URL}/merchant/billing?canceled=true`,
        metadata: { userId, type: "merchant" },
    });
    return session.url;
}
async function createMerchantPortalSession(userId) {
    const profile = await prisma_1.prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile?.stripeCustomerId)
        throw new errors_1.AppError("No merchant billing account found", 400);
    const session = await billing_service_1.stripe.billingPortal.sessions.create({
        customer: profile.stripeCustomerId,
        return_url: `${env_1.env.FRONTEND_URL}/merchant/billing`,
    });
    return session.url;
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
