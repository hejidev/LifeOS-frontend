"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTransaction = initializeTransaction;
exports.getSubscriptionManageLink = getSubscriptionManageLink;
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
const PAYSTACK_BASE_URL = "https://api.paystack.co";
async function paystackRequest(path, options = {}) {
    const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${env_1.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
    });
    const data = await res.json();
    if (!res.ok || data.status === false) {
        throw new errors_1.AppError(data.message ?? "Paystack request failed", res.status || 400);
    }
    return data.data;
}
function initializeTransaction(input) {
    return paystackRequest("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify(input),
    });
}
function getSubscriptionManageLink(subscriptionCode) {
    return paystackRequest(`/subscription/${subscriptionCode}/manage/link`);
}
