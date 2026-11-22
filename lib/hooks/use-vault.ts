"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { VaultDashboard, VaultSecrets } from "@/types/vault";

export function useVaultDashboard() {
  return useQuery<VaultDashboard>({
    queryKey: ["vaultDashboard"],
    queryFn: () => api.get("/vault/dashboard"),
    staleTime: 1000 * 30,
  });
}

export function useRevealVaultItem() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/vault/items/${id}/reveal`).then((d) => d.item as VaultSecrets),
    gcTime: 0,
  });
}

function useRefresh() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ["vaultDashboard"] }), qc.invalidateQueries({ queryKey: ["todayOverview"] })]);
}

export function useCreateVaultItem() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (data: Record<string, unknown>) => api.post("/vault/items", data), onSuccess: refresh });
}

export function useUpdateVaultItem() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/vault/items/${id}`, data),
    onSuccess: refresh,
  });
}

export function useDeleteVaultItem() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => api.delete(`/vault/items/${id}`), onSuccess: refresh });
}