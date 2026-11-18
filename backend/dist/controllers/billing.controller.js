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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhook = exports.portal = exports.checkout = exports.getSummary = void 0;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("../config/redis");
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
async function claimEvent(key) {
    try {
        return (await redis_1.redis.set(key, "1", "EX", 7 * 86400, "NX")) === "OK";
    }
    catch {
        return true;
    }
}
exports.webhook = (0, errors_1.asyncHandler)(async (req, res) => {
    const signature = String(req.headers["x-paystack-signature"] ?? "");
    if (!signature)
        throw new errors_1.AppError("Missing signature", 400);
    const expected = Buffer.from(crypto_1.default.createHmac("sha512", env_1.env.PAYSTACK_SECRET_KEY).update(req.body).digest("hex"));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !crypto_1.default.timingSafeEqual(expected, received))
        throw new errors_1.AppError("Invalid webhook signature", 400);
    let event;
    try {
        event = JSON.parse(req.body.toString());
    }
    catch {
        throw new errors_1.AppError("Invalid webhook body", 400);
    }
    const reference = event.data?.id ?? event.data?.reference ?? event.data?.subscription_code;
    const key = reference ? `paystack:event:${event.event}:${reference}` : null;
    if (key && !(await claimEvent(key)))
        return res.status(200).json({ received: true, duplicate: true });
    try {
        await billingService.handleWebhookEvent(event);
    }
    catch (err) {
        if (key)
            await redis_1.redis.del(key).catch(() => undefined);
        throw err;
    }
    return res.status(200).json({ received: true });
});
