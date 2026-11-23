import cron from "node-cron";
import { sendDueBillingReminders } from "../services/billing-reminders.service";
import { cleanupExpiredImageTools } from "../services/ai-image.service";
import { runHourlyReminders, runHousekeeping } from "../services/reminders.service";
import { runOnce } from "../lib/run-once";
import { logger } from "../lib/logger";

function guarded(name: string, ttlSeconds: number, job: () => Promise<unknown>, key: () => string = () => name) {
  return () => {
    void runOnce(key(), ttlSeconds, job)
      .then((ran) => ran && logger.info(`[cron] ${name} finished`))
      .catch((err) => logger.error(`[cron] ${name} failed:`, err));
  };
}

export function startCronJobs() {
  cron.schedule("0 8 * * *", guarded("billing-reminders", 3600, sendDueBillingReminders), { timezone: "Africa/Lagos" });

  cron.schedule("30 3 * * *", guarded("image-cleanup", 3600, cleanupExpiredImageTools), { timezone: "Africa/Lagos" });

  cron.schedule("5 * * * *", guarded("reminders", 3000, () => runHourlyReminders(), () => `reminders:${new Date().toISOString().slice(0, 13)}`), { timezone: "UTC" });

  cron.schedule("45 3 * * *", guarded("housekeeping", 7200, runHousekeeping), { timezone: "Africa/Lagos" });
}