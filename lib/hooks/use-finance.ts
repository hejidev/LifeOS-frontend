"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { FinanceAccount, FinanceCategory, FinanceDashboard } from "@/types/finance";

export function useFinanceSummary(month?: number, year?: number) {
  return useQuery<FinanceDashboard>({
    queryKey: ["finance", month ?? "current", year ?? "current"],
    queryFn: () => api.get(`/finance/dashboard${month && year ? `?month=${month}&year=${year}` : ""}`),
    staleTime: 1000 * 60,
    placeholderData: (previous) => previous,
  });
}

export function useFinanceAccounts() {
  return useQuery<FinanceAccount[]>({
    queryKey: ["financeAccounts"],
    queryFn: () => api.get("/finance/accounts").then((d) => d.accounts),
  });
}

export function useFinanceCategories() {
  return useQuery<FinanceCategory[]>({
    queryKey: ["financeCategories"],
    queryFn: () => api.get("/finance/categories").then((d) => d.categories),
    staleTime: 1000 * 60 * 5,
  });
}

function useFinanceMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["finance"] }),
        qc.invalidateQueries({ queryKey: ["financeAccounts"] }),
        qc.invalidateQueries({ queryKey: ["financeCategories"] }),
        qc.invalidateQueries({ queryKey: ["todayOverview"] }),
      ]),
  });
}

export const useCreateFinanceTransaction = () => useFinanceMutation((data: Record<string, unknown>) => api.post("/finance/transactions", data));
export const useUpdateFinanceTransaction = () => useFinanceMutation(({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/finance/transactions/${id}`, data));
export const useDeleteFinanceTransaction = () => useFinanceMutation((id: string) => api.delete(`/finance/transactions/${id}`));
export const useCreateTransfer = () => useFinanceMutation((data: Record<string, unknown>) => api.post("/finance/transfers", data));
export const useCreateFinanceAccount = () => useFinanceMutation((data: Record<string, unknown>) => api.post("/finance/accounts", data));
export const useUpdateFinanceAccount = () => useFinanceMutation(({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/finance/accounts/${id}`, data));
export const useDeleteFinanceAccount = () => useFinanceMutation((id: string) => api.delete(`/finance/accounts/${id}`));
export const useCreateFinanceCategory = () => useFinanceMutation((data: Record<string, unknown>) => api.post("/finance/categories", data));
export const useDeleteFinanceCategory = () => useFinanceMutation((id: string) => api.delete(`/finance/categories/${id}`));
export const useSaveBudget = () => useFinanceMutation((data: Record<string, unknown>) => api.post("/finance/budgets", data));