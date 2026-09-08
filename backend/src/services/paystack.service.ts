import { env } from "../config/env";
import { AppError } from "../lib/errors";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

async function paystackRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok || data.status === false) {
    throw new AppError(data.message ?? "Paystack request failed", res.status || 400);
  }
  return data.data as T;
}

interface InitializeTransactionInput {
  email: string;
  plan?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

interface InitializeTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export function initializeTransaction(input: InitializeTransactionInput) {
  return paystackRequest<InitializeTransactionResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

interface ManageLinkResult {
  link: string;
}

export function getSubscriptionManageLink(subscriptionCode: string) {
  return paystackRequest<ManageLinkResult>(`/subscription/${subscriptionCode}/manage/link`);
}