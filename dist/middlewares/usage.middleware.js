"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUsageOrSubscription = requireUsageOrSubscription;
const billing_service_1 = require("../services/billing.service");
function requireUsageOrSubscription(tool) {
    return async (req, _res, next) => {
        try {
            await (0, billing_service_1.checkAndConsumeUsage)(req.user.id, tool);
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
