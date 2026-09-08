import cron from "node-cron";
import { sendDueBillingReminders } from "../services/billing-reminders.service";
import { logger } from "../lib/logger";

export function startCronJobs() {
  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        await sendDueBillingReminders();
        logger.info("[cron] Billing reminders checked and sent");
      } catch (err) {
        logger.error("[cron] Billing reminder job failed:", err);
      }
    },
    { timezone: "Africa/Lagos" }
  );
}