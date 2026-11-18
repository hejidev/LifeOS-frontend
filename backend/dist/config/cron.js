"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = startCronJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const billing_reminders_service_1 = require("../services/billing-reminders.service");
const ai_image_service_1 = require("../services/ai-image.service");
const logger_1 = require("../lib/logger");
function startCronJobs() {
    node_cron_1.default.schedule("0 8 * * *", async () => {
        try {
            await (0, billing_reminders_service_1.sendDueBillingReminders)();
            logger_1.logger.info("[cron] Billing reminders checked and sent");
        }
        catch (err) {
            logger_1.logger.error("[cron] Billing reminder job failed:", err);
        }
    }, { timezone: "Africa/Lagos" });
    node_cron_1.default.schedule("30 3 * * *", () => {
        void (0, ai_image_service_1.cleanupExpiredImageTools)().catch((err) => console.error("[image-tools] cleanup failed:", err));
    }, { timezone: "Africa/Lagos" });
}
