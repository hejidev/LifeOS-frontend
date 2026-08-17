import Stripe from "stripe";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { PLANS, PlanKey, priceIdToTier, FREE_USES_PER_TOOL, merchantPriceIdToTier, BillingInterval } from "../config/plan";
import { createNotification } from "./notification.service";
import { sendSubscriptionConfirmationEmail } from "./email.service";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

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

  const priceId = interval === "year" ? plan.priceIdYearly : plan.priceIdMonthly;
  if (!priceId) throw new AppError("This plan isn't available for that billing interval", 400);

  const sub = await getOrCreateSubscription(userId);

  let customerId = sub.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { userId } });
    customerId = customer.id;
    await prisma.subscription.update({ where: { userId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/app/billing?success=true`,
    cancel_url: `${env.FRONTEND_URL}/app/billing?canceled=true`,
    metadata: { userId },
  });

  return session.url;
}

export async function createPortalSession(userId: string) {
  const sub = await getOrCreateSubscription(userId);
  if (!sub.stripeCustomerId) throw new AppError("No billing account found", 400);

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.FRONTEND_URL}/app/billing`,
  });

  return session.url;
}

export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const type = session.metadata?.type;
      if (!userId || !session.subscription) break;

      const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = stripeSub.items.data[0]?.price.id;
      const periodEnd = new Date(stripeSub.items.data[0].current_period_end * 1000);
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

      if (type === "merchant") {
        const resolved = priceId ? merchantPriceIdToTier(priceId) : null;
        const updated = await prisma.bizProfile.update({
          where: { userId },
          data: {
            planTier: resolved?.tier ?? "NONE",
            planStatus: "ACTIVE",
            stripeSubscriptionId: stripeSub.id,
            currentPeriodEnd: periodEnd,
          },
        });

        await createNotification(userId, {
          type: "BILLING",
          title: "Merchant plan active",
          message: `Your ${resolved?.tier ?? "plan"} merchant plan is now active — your dashboard is unlocked.`,
          actionUrl: "/merchant/dashboard",
        });

        if (user?.email) {
          await sendSubscriptionConfirmationEmail(user.email, {
            planName: `Merchant ${resolved?.tier ?? "plan"}`,
            interval: resolved?.interval === "year" ? "year" : "month",
            periodEnd,
          });
        }
      } else {
        const resolved = priceId ? priceIdToTier(priceId) : null;
        await prisma.subscription.update({
          where: { userId },
          data: {
            tier: resolved?.tier ?? "FREE",
            status: "ACTIVE",
            stripeSubscriptionId: stripeSub.id,
            currentPeriodEnd: periodEnd,
          },
        });

        await createNotification(userId, {
          type: "BILLING",
          title: "Subscription active",
          message: `Your ${resolved?.tier ?? "plan"} subscription is now active.`,
          actionUrl: "/app/billing",
        });

        if (user?.email) {
          await sendSubscriptionConfirmationEmail(user.email, {
            planName: resolved?.tier ?? "plan",
            interval: resolved?.interval === "year" ? "year" : "month",
            periodEnd,
          });
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const priceId = stripeSub.items.data[0]?.price.id;
      const periodEnd = new Date(stripeSub.items.data[0].current_period_end * 1000);
      const status = stripeSub.status === "active" ? "ACTIVE" : stripeSub.status === "past_due" ? "PAST_DUE" : "CANCELED";

      const toolSub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
      if (toolSub) {
        const resolved = priceId ? priceIdToTier(priceId) : null;
        await prisma.subscription.update({
          where: { id: toolSub.id },
          data: {
            tier: resolved?.tier ?? toolSub.tier,
            status,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          },
        });
        break;
      }

      const bizProfile = await prisma.bizProfile.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
      if (bizProfile) {
        const resolved = priceId ? merchantPriceIdToTier(priceId) : null;
        await prisma.bizProfile.update({
          where: { id: bizProfile.id },
          data: {
            planTier: resolved?.tier ?? bizProfile.planTier,
            planStatus: status,
            currentPeriodEnd: periodEnd,
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;

      const toolSub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
      if (toolSub) {
        await prisma.subscription.update({ where: { id: toolSub.id }, data: { tier: "FREE", status: "CANCELED", stripeSubscriptionId: null } });
        break;
      }

      const bizProfile = await prisma.bizProfile.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
      if (bizProfile) {
        await prisma.bizProfile.update({ where: { id: bizProfile.id }, data: { planTier: "NONE", planStatus: "INACTIVE", stripeSubscriptionId: null } });
      }
      break;
    }
  }
}
