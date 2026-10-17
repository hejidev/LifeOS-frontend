import { prisma } from "../config/prisma";
import { PLANS, MERCHANT_PLANS } from "../config/plan";
import { sendBillingReminderEmail } from "./email.service";

const REMINDER_DAYS = [30, 21, 14, 7, 6, 5, 4, 3, 2, 1];

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export async function sendDueBillingReminders() {
  const [subscriptions, merchantProfiles] = await Promise.all([
    prisma.subscription.findMany({
      where: { status: "ACTIVE", tier: { not: "FREE" }, currentPeriodEnd: { not: null } },
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.bizProfile.findMany({
      where: { planStatus: "ACTIVE", currentPeriodEnd: { not: null } },
      include: { user: { select: { email: true, name: true } } },
    }),
  ]);

  for (const sub of subscriptions) {
    const days = daysUntil(sub.currentPeriodEnd!);
    if (!REMINDER_DAYS.includes(days)) continue;
    const plan = PLANS[sub.tier as keyof typeof PLANS];
    await sendBillingReminderEmail(sub.user.email, sub.user.name ?? "there", plan?.name ?? sub.tier, days, sub.currentPeriodEnd!);
  }

  for (const profile of merchantProfiles) {
    const days = daysUntil(profile.currentPeriodEnd!);
    if (!REMINDER_DAYS.includes(days)) continue;
    const plan = MERCHANT_PLANS[profile.planTier as keyof typeof MERCHANT_PLANS];
    await sendBillingReminderEmail(profile.user.email, profile.user.name ?? "there", plan?.name ?? profile.planTier, days, profile.currentPeriodEnd!);
  }
}