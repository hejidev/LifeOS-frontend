import { prisma } from "../config/prisma";
import { getOrCreateProfile } from "./business.service";
import { sendCustomerBroadcastEmail } from "./email.service";

export async function sendCustomerMessage(userId: string, data: { customerIds: string[]; subject: string; body: string }) {
  const profile = await getOrCreateProfile(userId);

  const customers = await prisma.bizCustomer.findMany({
    where: { userId, id: { in: data.customerIds } },
  });

  const result = { sent: 0, skippedNoEmail: 0, failed: 0, errors: [] as { name: string; error: string }[] };

  for (const customer of customers) {
    if (!customer.email) {
      result.skippedNoEmail++;
      continue;
    }
    try {
      await sendCustomerBroadcastEmail(customer.email, profile.businessName, data.subject, data.body);
      result.sent++;
    } catch (err: any) {
      result.failed++;
      result.errors.push({ name: customer.name, error: err.message ?? "Send failed" });
    }
  }

  return result;
}