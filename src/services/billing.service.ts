import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { PLANS, PlanKey, planCodeToTier, FREE_USES_PER_TOOL, merchantPlanCodeToTier, BillingInterval } from "../config/plan";
import { createNotification } from "./notification.service";
import { sendSubscriptionConfirmationEmail } from "./email.service";
import * as paystack from "./paystack.service";

export async function getOrCreateSubscription(userId: string) {
  let sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) sub = await prisma.subscription.create({ data: { userId } });
  return sub;
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
    plans: PLANS,
  };
}

export async function checkAndConsumeUsage(userId: string, tool: "AI_WRITING" | "AI_IMAGE" | "FILE_CONVERTER") {
  const sub = await getOrCreateSubscription(userId);
  if (sub.tier !== "FREE" && sub.status === "ACTIVE") return;

  const usage = await prisma.toolUsage.upsert({
    where: { userId_tool: { userId, tool } },
    update: {},
    create: { userId, tool, count: 0 },
  });

  if (usage.count >= FREE_USES_PER_TOOL) {
    throw new AppError(
      `You've used your ${FREE_USES_PER_TOOL} free uses for this tool. Subscribe to keep using it.`,
      402
    );
  }

  await prisma.toolUsage.update({ where: { id: usage.id }, data: { count: { increment: 1 } } });
}

export async function createCheckoutSession(userId: string, email: string, planKey: PlanKey, interval: BillingInterval = "month") {
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

export async function handleWebhookEvent(event: { event: string; data: any }) {
  switch (event.event) {
    case "charge.success": {
      const data = event.data;
      const userId = data.metadata?.userId;
      const type = data.metadata?.type;
      const planCode = data.plan?.plan_code ?? data.plan_object?.plan_code;
      if (!userId || !planCode) break;

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      const periodEnd = data.plan_object?.next_payment_date ? new Date(data.plan_object.next_payment_date) : null;

      if (type === "merchant") {
        const resolved = merchantPlanCodeToTier(planCode);
        const updated = await prisma.bizProfile.update({
          where: { userId },
          data: {
            planTier: resolved?.tier ?? "NONE",
            planStatus: "ACTIVE",
            paystackCustomerCode: data.customer?.customer_code,
            paystackSubscriptionCode: data.subscription?.subscription_code ?? undefined,
            currentPeriodEnd: periodEnd ?? undefined,
          },
        });

        await createNotification(userId, {
          type: "BILLING",
          title: "Merchant plan active",
          message: `Your ${resolved?.tier ?? "plan"} merchant plan is now active — your dashboard is unlocked.`,
          actionUrl: "/merchant/dashboard",
        });

        if (user?.email && periodEnd) {
          await sendSubscriptionConfirmationEmail(user.email, {
            planName: `Merchant ${resolved?.tier ?? "plan"}`,
            interval: resolved?.interval === "year" ? "year" : "month",
            periodEnd,
          });
        }
      } else {
        const resolved = planCodeToTier(planCode);
        await prisma.subscription.update({
          where: { userId },
          data: {
            tier: resolved?.tier ?? "FREE",
            status: "ACTIVE",
            paystackCustomerCode: data.customer?.customer_code,
            paystackSubscriptionCode: data.subscription?.subscription_code ?? undefined,
            currentPeriodEnd: periodEnd ?? undefined,
          },
        });

        await createNotification(userId, {
          type: "BILLING",
          title: "Subscription active",
          message: `Your ${resolved?.tier ?? "plan"} subscription is now active.`,
          actionUrl: "/app/billing",
        });

        if (user?.email && periodEnd) {
          await sendSubscriptionConfirmationEmail(user.email, {
            planName: resolved?.tier ?? "plan",
            interval: resolved?.interval === "year" ? "year" : "month",
            periodEnd,
          });
        }
      }
      break;
    }

    case "subscription.disable": {
      const data = event.data;
      const subscriptionCode = data.subscription_code;

      const toolSub = await prisma.subscription.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } });
      if (toolSub) {
        await prisma.subscription.update({ where: { id: toolSub.id }, data: { tier: "FREE", status: "CANCELED", paystackSubscriptionCode: null } });
        break;
      }

      const bizProfile = await prisma.bizProfile.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } });
      if (bizProfile) {
        await prisma.bizProfile.update({ where: { id: bizProfile.id }, data: { planTier: "NONE", planStatus: "INACTIVE", paystackSubscriptionCode: null } });
      }
      break;
    }

    case "invoice.payment_failed": {
      const data = event.data;
      const subscriptionCode = data.subscription?.subscription_code;
      if (!subscriptionCode) break;

      const toolSub = await prisma.subscription.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } });
      if (toolSub) {
        await prisma.subscription.update({ where: { id: toolSub.id }, data: { status: "PAST_DUE" } });
        break;
      }

      const bizProfile = await prisma.bizProfile.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } });
      if (bizProfile) {
        await prisma.bizProfile.update({ where: { id: bizProfile.id }, data: { planStatus: "PAST_DUE" } });
      }
      break;
    }
  }
}