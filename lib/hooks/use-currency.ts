"use client";

import { useUserProfile } from "@/lib/hooks/use-life-data";
import { formatCurrency } from "@/lib/utils";

export function useMoney() {
  const { data } = useUserProfile();
  const currency = data?.currency ?? "NGN";
  return { currency, money: (amount: number, code: string = currency) => formatCurrency(amount, code) };
}