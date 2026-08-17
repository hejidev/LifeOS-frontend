"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhook = exports.portal = exports.checkout = exports.getSummary = void 0;
const errors_1 = require("../lib/errors");
const env_1 = require("../config/env");
const billingService = __importStar(require("../services/billing.service"));
exports.getSummary = (0, errors_1.asyncHandler)(async (req, res) => {
    const summary = await billingService.getBillingSummary(req.user.id);
    return res.json(summary);
});
exports.checkout = (0, errors_1.asyncHandler)(async (req, res) => {
    const { plan, interval } = req.body;
    const url = await billingService.createCheckoutSession(req.user.id, req.user.email, plan, interval);
    return res.json({ url });
});
exports.portal = (0, errors_1.asyncHandler)(async (req, res) => {
    const url = await billingService.createPortalSession(req.user.id);
    return res.json({ url });
});
exports.webhook = (0, errors_1.asyncHandler)(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature)
        throw new errors_1.AppError("Missing signature", 400);
    let event;
    try {
        event = billingService.stripe.webhooks.constructEvent(req.body, signature, env_1.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        throw new errors_1.AppError("Invalid webhook signature", 400);
    }
    await billingService.handleWebhookEvent(event);
    return res.json({ received: true });
});
