import { cloudinary } from "../config/cloudinary";
import { env } from "../config/env";
import crypto from "crypto";
import { BillingInterval, MERCHANT_PLANS, MerchantPlanKey } from "../config/plan";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/errors";
import * as paystack from "./paystack.service";
import { createNotification } from "./notification.service";
import { logAdminAction } from "./audit.service";
import { sendMerchantApprovedEmail, sendMerchantReactivatedEmail, sendMerchantRejectedEmail, sendMerchantSuspendedEmail } from "./email.service";

export async function getApplicationStatus(userId: string) {
  const profile = await prisma.bizProfile.findUnique({ where: { userId } });
  if (!profile) return { status: "NONE" as const };

  const billingInterval = (profile as any).billingInterval as string | null | undefined;

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

export async function applyAsMerchant(userId: string, data: {
  businessName: string; category: string; description: string;
  contactPhone: string; contactEmail: string; address: string; currency?: string;
  idDocumentType: string; idDocumentNumber: string; idFrontUrl: string; idBackUrl?: string;
}) {
  const existing = await prisma.bizProfile.findUnique({ where: { userId } });

  if (existing) {
    if (existing.status === "APPROVED") throw new AppError("You're already an approved merchant", 409);
    if (existing.status === "PENDING") throw new AppError("Your merchant application is already under review", 409);
    if (existing.status === "SUSPENDED") throw new AppError("Your merchant account is suspended. Contact support.", 403);

    return prisma.bizProfile.update({
      where: { userId },
      data: {
        businessName: data.businessName,
        category: data.category as any,
        description: data.description,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        address: data.address,
        currency: data.currency ?? "USD",
        idDocumentType: data.idDocumentType as any,
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

  return prisma.bizProfile.create({
    data: {
      userId,
      businessName: data.businessName,
      category: data.category as any,
      description: data.description,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      address: data.address,
      currency: data.currency ?? "USD",
      idDocumentType: data.idDocumentType as any,
      idDocumentNumber: data.idDocumentNumber,
      idFrontUrl: data.idFrontUrl,
      idBackUrl: data.idBackUrl,
      status: "PENDING",
    },
  });
}

export async function uploadIdDocument(buffer: Buffer) {
  const uploaded = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "lifeos/merchant-id-docs", resource_type: "auto" },
      (err, result) => (err || !result ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
  return { url: uploaded.secure_url };
}

export async function markIdVerified(reviewerId: string, bizProfileId: string) {
  const profile = await prisma.bizProfile.findUnique({ where: { id: bizProfileId } });
  if (!profile) throw new AppError("Merchant not found", 404);
  const updated = await prisma.bizProfile.update({ where: { id: bizProfileId }, data: { idVerifiedAt: new Date() } });
  await logAdminAction(reviewerId, "MERCHANT_ID_VERIFIED", "BizProfile", bizProfileId, `Verified ID for ${updated.businessName}`);
  return updated;
}

export async function createMerchantCheckout(userId: string, email: string, planKey: MerchantPlanKey, interval: BillingInterval = "month") {
  const profile = await prisma.bizProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("Apply as a merchant first", 404);
  if (profile.status !== "APPROVED") throw new AppError("Your application must be approved before choosing a plan", 403);

  const plan = MERCHANT_PLANS[planKey];
  if (!plan) throw new AppError("Invalid plan", 400);

  const planCode = interval === "year" ? plan.planCodeYearly : plan.planCodeMonthly;
  if (!planCode) throw new AppError("This plan isn't available for that billing interval", 400);

  const result = await paystack.initializeTransaction({
    email,
    plan: planCode,
    callback_url: `${env.FRONTEND_URL}/merchant/dashboard?merchantPlanActive=true`,
    metadata: { userId, type: "merchant" },
  });

  return result.authorization_url;
}

export async function createMerchantPortalSession(userId: string) {
  const profile = await prisma.bizProfile.findUnique({ where: { userId } });
  if (!profile?.paystackSubscriptionCode) throw new AppError("No merchant billing account found", 400);

  const result = await paystack.getSubscriptionManageLink(profile.paystackSubscriptionCode);
  return result.link;
}

// ─── Admin review ──────────────────────────────────────────────────────────

export async function listApplications(status?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED") {
  return prisma.bizProfile.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { appliedAt: "desc" },
  });
}

export async function reviewApplication(
  reviewerId: string,
  bizProfileId: string,
  action: "APPROVE" | "REJECT",
  rejectionReason?: string
) {
  const profile = await prisma.bizProfile.findUnique({ where: { id: bizProfileId } });
  if (!profile) throw new AppError("Application not found", 404);
  if (profile.status !== "PENDING") throw new AppError("This application has already been reviewed", 409);

  return prisma.bizProfile.update({
    where: { id: bizProfileId },
    data: {
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      rejectionReason: action === "REJECT" ? rejectionReason ?? "Not specified" : null,
    },
  });
}

export async function changeMerchantStatus(
  reviewerId: string,
  bizProfileId: string,
  action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE",
  reason?: string
) {
  const profile = await prisma.bizProfile.findUnique({ where: { id: bizProfileId } });
  if (!profile) throw new AppError("Merchant not found", 404);

  if (action === "APPROVE") {
    if (profile.status !== "PENDING") throw new AppError("Only pending applications can be approved", 409);
    const updated = await prisma.bizProfile.update({
      where: { id: bizProfileId },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: reviewerId, rejectionReason: null },
    });
    await logAdminAction(reviewerId, "MERCHANT_APPROVED", "BizProfile", bizProfileId, `Approved ${updated.businessName}`);
    await createNotification(updated.userId, { type: "MERCHANT", title: "You're approved!", message: `${updated.businessName} was approved. Choose a plan to activate your dashboard.`, actionUrl: "/merchant/billing" });

    const owner = await prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true } });
    if (owner) await sendMerchantApprovedEmail(owner.email, updated.businessName);

    return updated;
  }

  if (action === "REJECT") {
    if (profile.status !== "PENDING") throw new AppError("Only pending applications can be rejected", 409);
    const updated = await prisma.bizProfile.update({
      where: { id: bizProfileId },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedBy: reviewerId, rejectionReason: reason ?? "Not specified" },
    });
    await logAdminAction(reviewerId, "MERCHANT_REJECTED", "BizProfile", bizProfileId, `Rejected ${updated.businessName}`);    
    await createNotification(updated.userId, { type: "MERCHANT", title: "Application not approved", message: reason ?? "Your merchant application was not approved.", actionUrl: "/merchant/apply" });

    const owner = await prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true } });
    if (owner) await sendMerchantRejectedEmail(owner.email, updated.businessName, reason);

    return updated;
  }

  if (action === "SUSPEND") {
    if (profile.status !== "APPROVED") throw new AppError("Only approved merchants can be suspended", 409);
    const updated = await prisma.bizProfile.update({
      where: { id: bizProfileId },
      data: { status: "SUSPENDED", reviewedAt: new Date(), reviewedBy: reviewerId, rejectionReason: reason ?? "Suspended by admin" },
    });
    await logAdminAction(reviewerId, "MERCHANT_SUSPENDED", "BizProfile", bizProfileId, `Suspended ${updated.businessName}`);  
    await createNotification(updated.userId, { type: "ALERT", title: "Merchant account suspended", message: reason ?? "Your merchant account has been suspended." });

    const owner = await prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true } });
    if (owner) await sendMerchantSuspendedEmail(owner.email, updated.businessName, reason);

    return updated;
  }

  if (action === "REACTIVATE") {
    if (profile.status !== "SUSPENDED") throw new AppError("Only suspended merchants can be reactivated", 409);
    const updated = await prisma.bizProfile.update({
      where: { id: bizProfileId },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: reviewerId, rejectionReason: null },
    });
    await logAdminAction(reviewerId, "MERCHANT_REACTIVATED", "BizProfile", bizProfileId, `Reactivated ${updated.businessName}`);
    await createNotification(updated.userId, { type: "SUCCESS", title: "Merchant account reactivated", message: "Your merchant account is active again." });

    const owner = await prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true } });
    if (owner) await sendMerchantReactivatedEmail(owner.email, updated.businessName);

    return updated;
  }
  throw new AppError("Invalid action", 400);
}
  
  export async function getApplicationDetail(bizProfileId: string) {
    const profile = await prisma.bizProfile.findUnique({
      where: { id: bizProfileId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    });
    if (!profile) throw new AppError("Merchant not found", 404);
  
    const staffCount = await prisma.bizStaff.count({ where: { bizProfileId } });
    return { ...profile, staffCount };
  }

  export async function regenerateStoreCode(userId: string) {
    const profile = await prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError("Merchant profile not found", 404);
    const newCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    return prisma.bizProfile.update({ where: { id: profile.id }, data: { staffLoginCode: newCode } });
  }
  
  export async function forceStaffLogout(userId: string) {
    const profile = await prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError("Merchant profile not found", 404);
    return prisma.bizProfile.update({ where: { id: profile.id }, data: { staffTokenVersion: { increment: 1 } } });
  }
  
  export async function updateNotificationSettings(userId: string, data: {
    notifyLowStock?: boolean; notifyNewSale?: boolean; notifyDailySummary?: boolean;
  }) {
    return prisma.bizProfile.update({ where: { userId }, data });
  }
  
  export async function setPaused(userId: string, paused: boolean) {
    return prisma.bizProfile.update({ where: { userId }, data: { paused } });
  }