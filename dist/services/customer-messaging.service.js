"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCustomerMessage = sendCustomerMessage;
const prisma_1 = require("../config/prisma");
const business_service_1 = require("./business.service");
const email_service_1 = require("./email.service");
async function sendCustomerMessage(userId, data) {
    const profile = await (0, business_service_1.getOrCreateProfile)(userId);
    const customers = await prisma_1.prisma.bizCustomer.findMany({
        where: { userId, id: { in: data.customerIds } },
    });
    const result = { sent: 0, skippedNoEmail: 0, failed: 0, errors: [] };
    for (const customer of customers) {
        if (!customer.email) {
            result.skippedNoEmail++;
            continue;
        }
        try {
            await (0, email_service_1.sendCustomerBroadcastEmail)(customer.email, profile.businessName, data.subject, data.body);
            result.sent++;
        }
        catch (err) {
            result.failed++;
            result.errors.push({ name: customer.name, error: err.message ?? "Send failed" });
        }
    }
    return result;
}
