"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { DocsDashboard } from "@/types/documents";

export function useDocumentsDashboard() {
  return useQuery<DocsDashboard>({
    queryKey: ["documentsDashboard"],
    queryFn: () => api.get("/documents/dashboard"),
    staleTime: 1000 * 60,
  });
}

export function useDocuments() {
  const { data, ...rest } = useDocumentsDashboard();
  return { documents: data?.documents ?? [], folders: data?.folders ?? [], stats: data?.stats, ...rest };
}

function useRefresh() {
  const qc = useQueryClient();
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: ["documentsDashboard"] }), qc.invalidateQueries({ queryKey: ["todayOverview"] })]);
}

export function useCreateDocument() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (data: Record<string, unknown>) => api.post("/documents", data), onSuccess: refresh });
}

export function useUpdateDocument() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/documents/${id}`, data),
    onSuccess: refresh,
  });
}

export function useDeleteDocument() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => api.delete(`/documents/${id}`), onSuccess: refresh });
}

export function useUploadDocumentFile() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload("/documents/upload", formData) as Promise<{ fileUrl: string; fileName: string; fileType: string; fileSize: number }>;
    },
  });
}

export function useCreateDocumentFolder() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (data: Record<string, unknown>) => api.post("/documents/folders", data), onSuccess: refresh });
}

export function useUpdateDocumentFolder() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/documents/folders/${id}`, data),
    onSuccess: refresh,
  });
}

export function useDeleteDocumentFolder() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => api.delete(`/documents/folders/${id}`), onSuccess: refresh });
}