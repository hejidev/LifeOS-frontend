"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { BillingSummary, PlanKey } from "@/types/billing";

export function useBillingSummary() {
  return useQuery<BillingSummary>({
    queryKey: ["billing"],
    queryFn: () => api.get("/billing/summary"),
    staleTime: 1000 * 30,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: ({ plan, interval }: { plan: PlanKey; interval: "month" | "year" }) =>
      api.post("/billing/checkout", { plan, interval }).then((d) => d.url as string),
  });
}

export function useBillingPortal() {
  return useMutation({ mutationFn: () => api.post("/billing/portal").then((d) => d.url as string) });
}