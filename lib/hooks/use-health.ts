"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { HealthDashboard } from "@/types/health";

export function useHealthSummary() {
  return useQuery<HealthDashboard>({
    queryKey: ["health"],
    queryFn: () => api.get("/health/summary"),
    staleTime: 1000 * 60,
  });
}

export function useLogHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/health/log", data),
    onSuccess: () =>
      Promise.all([qc.invalidateQueries({ queryKey: ["health"] }), qc.invalidateQueries({ queryKey: ["todayOverview"] })]),
  });
}