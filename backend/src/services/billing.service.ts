import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { PLANS, PlanKey, planCodeToTier, FREE_USES_PER_TOOL, merchantPlanCodeToTier, BillingInterval, publicPlans } from "../config/plan";
import { createNotification } from "./notification.service";
import { sendSubscriptionConfirmationEmail } from "./email.service";
import * as paystack from "./paystack.service";

export async function getOrCreateSubscription(userId: string) {
  return prisma.subscription.upsert({ where: { userId }, update: {}, create: { userId } });
}

export async function getBillingSummary(userId: string) {
  const sub = await getOrCreateSubscription(userId);
  const usage = await prisma.toolUsage.findMany({ where: { userId } });

  const usageMap: Record<string, number> = {};
  for (const u of usage) usageMap[u.tool] = u.count;

  return {
    tier: sub.tier,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString(),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    isPaid: sub.tier !== "FREE" && sub.status === "ACTIVE",
    freeUsesPerTool: FREE_USES_PER_TOOL,
    usage: {
      AI_WRITING: usageMap.AI_WRITING ?? 0,
      AI_IMAGE: usageMap.AI_IMAGE ?? 0,
      FILE_CONVERTER: usageMap.FILE_CONVERTER ?? 0,
    },
    billingInterval: sub.billingInterval ?? null,
    plans: publicPlans(),
  };
}

export async function checkAndConsumeUsage(userId: string, tool: "AI_WRITING" | "AI_IMAGE" | "FILE_CONVERTER") {
  const sub = await getOrCreateSubscription(userId);
  if (sub.tier !== "FREE" && sub.status === "ACTIVE") return false;

  await prisma.toolUsage.createMany({ data: [{ userId, tool, count: 0 }], skipDuplicates: true });

  const updated = await prisma.toolUsage.updateMany({
    where: { userId, tool, count: { lt: FREE_USES_PER_TOOL } },
    data: { count: { increment: 1 } },
  });

  if (updated.count === 0) {
    throw new AppError(`You've used your ${FREE_USES_PER_TOOL} free uses for this tool. Subscribe to keep using it.`, 402);
  }
  return true;
}

export async function refundUsage(userId: string, tool: "AI_WRITING" | "AI_IMAGE" | "FILE_CONVERTER") {
  await prisma.toolUsage.updateMany({ where: { userId, tool, count: { gt: 0 } }, data: { count: { decrement: 1 } } });
}

export async function createCheckoutSession(userId: string, email: string, planKey: PlanKey, interval: BillingInterval = "month") {
  const current = await getOrCreateSubscription(userId);
  if (current.tier !== "FREE" && current.status === "ACTIVE") {
    throw new AppError("You already have an active subscription. Use Manage subscription to change or cancel it.", 409);
  }
  
  const plan = PLANS[planKey];
  if (!plan) throw new AppError("Invalid plan", 400);

  const planCode = interval === "year" ? plan.planCodeYearly : plan.planCodeMonthly;
  if (!planCode) throw new AppError("This plan isn't available for that billing interval", 400);

  const result = await paystack.initializeTransaction({
    email,
    plan: planCode,
    callback_url: `${env.FRONTEND_URL}/app/billing?success=true`,
    metadata: { userId },
  });

  return result.authorization_url;
}

export async function createPortalSession(userId: string) {
  const sub = await getOrCreateSubscription(userId);
  if (!sub.paystackSubscriptionCode) throw new AppError("No billing account found", 400);

  const result = await paystack.getSubscriptionManageLink(sub.paystackSubscriptionCode);
  return result.link;
}

async function handleChargeSuccess(data: any) {
  const userId = data.metadata?.userId;
  const planCode = data.plan?.plan_code ?? data.plan_object?.plan_code;
  if (!userId || !planCode) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return;

  const periodEnd = data.plan_object?.next_payment_date ? new Date(data.plan_object.next_payment_date) : null;
  const customerCode = data.customer?.customer_code;
  const subscriptionCode = data.subscription?.subscription_code ?? undefined;

  if (data.metadata?.type === "merchant") {
    const resolved = merchantPlanCodeToTier(planCode);
    const profile = await prisma.bizProfile.findUnique({ where: { userId } });
    if (!profile) return;

    const renewal = profile.planStatus === "ACTIVE" && profile.planTier === (resolved?.tier ?? "NONE");
    await prisma.bizProfile.update({
      where: { userId },
      data: {
        planTier: resolved?.tier ?? "NONE",
        planStatus: "ACTIVE",
        paystackCustomerCode: customerCode,
        paystackSubscriptionCode: subscriptionCode,
        currentPeriodEnd: periodEnd ?? undefined,
      },
    });
    if (renewal) return;

    await createNotification(userId, {
      type: "BILLING",
      title: "Merchant plan active",
      message: `Your ${resolved?.tier ?? "plan"} merchant plan is now active. Your dashboard is unlocked.`,
      actionUrl: "/merchant/dashboard",
    });
    if (user.email && periodEnd) {
      await sendSubscriptionConfirmationEmail(user.email, { planName: `Merchant ${resolved?.tier ?? "plan"}`, interval: resolved?.interval === "year" ? "year" : "month", periodEnd });
    }
    return;
  }

  const resolved = planCodeToTier(planCode);
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  const renewal = !!existing && existing.status === "ACTIVE" && existing.tier === (resolved?.tier ?? "FREE");

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      tier: resolved?.tier ?? "FREE",
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
      billingInterval: resolved?.interval,
      paystackCustomerCode: customerCode,
      paystackSubscriptionCode: subscriptionCode,
      currentPeriodEnd: periodEnd ?? undefined,
    },
    create: {
      userId,
      tier: resolved?.tier ?? "FREE",
      status: "ACTIVE",
      billingInterval: resolved?.interval,
      paystackCustomerCode: customerCode,
      paystackSubscriptionCode: subscriptionCode,
      currentPeriodEnd: periodEnd ?? undefined,
    },
  });
  if (renewal) return;

  await createNotification(userId, {
    type: "BILLING",
    title: "Subscription active",
    message: `Your ${resolved?.tier ?? "plan"} subscription is now active.`,
    actionUrl: "/app/billing",
  });
  if (user.email && periodEnd) {
    await sendSubscriptionConfirmationEmail(user.email, { planName: resolved?.tier ?? "plan", interval: resolved?.interval === "year" ? "year" : "month", periodEnd });
  }
}

async function handleSubscriptionCreate(data: any) {
  const email = String(data.customer?.email ?? "").trim();
  const planCode = data.plan?.plan_code;
  const subscriptionCode = data.subscription_code;
  if (!email || !planCode || !subscriptionCode) return;

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (!user) return;

  const periodEnd = data.next_payment_date ? new Date(data.next_payment_date) : undefined;
  const customerCode = data.customer?.customer_code;

  if (merchantPlanCodeToTier(planCode)) {
    await prisma.bizProfile.updateMany({
      where: { userId: user.id },
      data: { paystackSubscriptionCode: subscriptionCode, paystackCustomerCode: customerCode, currentPeriodEnd: periodEnd },
    });
    return;
  }

  const resolved = planCodeToTier(planCode);
  if (!resolved) return;

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      tier: resolved.tier,
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
      billingInterval: resolved.interval,
      paystackSubscriptionCode: subscriptionCode,
      paystackCustomerCode: customerCode,
      currentPeriodEnd: periodEnd,
    },
    create: {
      userId: user.id,
      tier: resolved.tier,
      status: "ACTIVE",
      billingInterval: resolved.interval,
      paystackSubscriptionCode: subscriptionCode,
      paystackCustomerCode: customerCode,
      currentPeriodEnd: periodEnd,
    },
  });
}

async function handleNotRenewing(data: any) {
  const code = data.subscription_code;
  if (code) await prisma.subscription.updateMany({ where: { paystackSubscriptionCode: code }, data: { cancelAtPeriodEnd: true } });
}

async function handleDisable(data: any) {
  const code = data.subscription_code;
  if (!code) return;

  const toolSub = await prisma.subscription.findFirst({ where: { paystackSubscriptionCode: code } });
  if (toolSub) {
    await prisma.subscription.update({
      where: { id: toolSub.id },
      data: { tier: "FREE", status: "CANCELED", cancelAtPeriodEnd: false, billingInterval: null, paystackSubscriptionCode: null },
    });
    return;
  }

  await prisma.bizProfile.updateMany({ where: { paystackSubscriptionCode: code }, data: { planTier: "NONE", planStatus: "INACTIVE", paystackSubscriptionCode: null } });
}

async function handlePaymentFailed(data: any) {
  const code = data.subscription?.subscription_code;
  if (!code) return;

  const updated = await prisma.subscription.updateMany({ where: { paystackSubscriptionCode: code }, data: { status: "PAST_DUE" } });
  if (updated.count === 0) await prisma.bizProfile.updateMany({ where: { paystackSubscriptionCode: code }, data: { planStatus: "PAST_DUE" } });
}

export async function handleWebhookEvent(event: { event: string; data: any }) {
  switch (event.event) {
    case "charge.success":
      return handleChargeSuccess(event.data);
    case "subscription.create":
      return handleSubscriptionCreate(event.data);
    case "subscription.not_renew":
      return handleNotRenewing(event.data);
    case "subscription.disable":
      return handleDisable(event.data);
    case "invoice.payment_failed":
      return handlePaymentFailed(event.data);
  }
}