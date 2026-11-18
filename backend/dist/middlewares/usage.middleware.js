"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUsageOrSubscription = requireUsageOrSubscription;
const billing_service_1 = require("../services/billing.service");
function requireUsageOrSubscription(tool) {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const charged = await (0, billing_service_1.checkAndConsumeUsage)(userId, tool);
            if (charged) {
                res.once("close", () => {
                    if (res.statusCode >= 400 || !res.headersSent) {
                        void (0, billing_service_1.refundUsage)(userId, tool).catch((err) => console.error("[usage] refund failed:", err));
                    }
                });
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
