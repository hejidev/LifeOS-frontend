"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDueBillingReminders = sendDueBillingReminders;
const prisma_1 = require("../config/prisma");
const plan_1 = require("../config/plan");
const email_service_1 = require("./email.service");
const REMINDER_DAYS = [30, 21, 14, 7, 6, 5, 4, 3, 2, 1];
function daysUntil(date) {
    return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}
async function sendDueBillingReminders() {
    const [subscriptions, merchantProfiles] = await Promise.all([
        prisma_1.prisma.subscription.findMany({
            where: { status: "ACTIVE", tier: { not: "FREE" }, currentPeriodEnd: { not: null } },
            include: { user: { select: { email: true, name: true } } },
        }),
        prisma_1.prisma.bizProfile.findMany({
            where: { planStatus: "ACTIVE", currentPeriodEnd: { not: null } },
            include: { user: { select: { email: true, name: true } } },
        }),
    ]);
    for (const sub of subscriptions) {
        const days = daysUntil(sub.currentPeriodEnd);
        if (!REMINDER_DAYS.includes(days))
            continue;
        const plan = plan_1.PLANS[sub.tier];
        await (0, email_service_1.sendBillingReminderEmail)(sub.user.email, sub.user.name ?? "there", plan?.name ?? sub.tier, days, sub.currentPeriodEnd);
    }
    for (const profile of merchantProfiles) {
        const days = daysUntil(profile.currentPeriodEnd);
        if (!REMINDER_DAYS.includes(days))
            continue;
        const plan = plan_1.MERCHANT_PLANS[profile.planTier];
        await (0, email_service_1.sendBillingReminderEmail)(profile.user.email, profile.user.name ?? "there", plan?.name ?? profile.planTier, days, profile.currentPeriodEnd);
    }
}
