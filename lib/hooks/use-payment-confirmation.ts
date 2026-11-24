"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useStoreContext } from "@/lib/context/store-context";
import { useRefreshOps } from "@/lib/hooks/use-merchant-ops";

export interface PendingPayment {
  id: string;
  receiptNumber: string;
  total: number;
  paymentMethod: string;
  paymentReference: string | null;
  confirmation: "AWAITING" | "DISPUTED";
  staffName: string;
  customerName: string | null;
  storeName: string | null;
  soldOffline: boolean;
  reviewNotes: string | null;
  createdAt: string;
}

export interface PaymentSummary {
  awaitingCount: number;
  awaitingTotal: number;
  disputedCount: number;
  disputedTotal: number;
}

export function usePendingPayments() {
  const { currentStoreId } = useStoreContext();
  return useQuery<PendingPayment[]>({
    queryKey: ["ops", "payments-pending", currentStoreId],
    queryFn: () => api.get(`/payment-confirmation/pending?storeId=${currentStoreId}`).then((d) => d.payments),
    enabled: !!currentStoreId,
    refetchInterval: 30000,
  });
}

export function usePaymentSummary() {
  const { currentStoreId } = useStoreContext();
  return useQuery<PaymentSummary>({
    queryKey: ["ops", "payments-summary", currentStoreId],
    queryFn: () => api.get(`/payment-confirmation/summary?storeId=${currentStoreId}`),
    enabled: !!currentStoreId,
    refetchInterval: 30000,
  });
}

export function useConfirmPayments() {
  const refresh = useRefreshOps();
  return useMutation({ mutationFn: (ids: string[]) => api.post("/payment-confirmation/confirm", { ids }), onSuccess: refresh });
}

export function useDisputePayment() {
  const refresh = useRefreshOps();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/payment-confirmation/${id}/dispute`, { reason }),
    onSuccess: refresh,
  });
}