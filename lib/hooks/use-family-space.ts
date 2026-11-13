"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

const base = "/family-space";

export interface Lock {
  locked: boolean;
  until: string | null;
  source: "bedtime" | "parent" | null;
}

export interface Schedule {
  id?: string;
  label: string;
  days: number[];
  startMin: number;
  endMin: number;
  enabled: boolean;
}

export interface FamilyMe {
  role: "none" | "parent" | "child";
  familyCode?: string;
  consent?: boolean;
  name?: string;
  lock?: Lock;
  schedules?: Schedule[];
}

export interface FamilyKid {
  id: string;
  name: string;
  role: string;
  hasAccount: boolean;
  lock: Lock | null;
  schedules: Schedule[];
  override: { kind: "LOCK" | "UNLOCK"; until: string } | null;
}

export interface Thread {
  key: string;
  title: string;
  unread: number;
  last: { body: string; at: string; senderName: string } | null;
}

export interface FamilyMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  mine: boolean;
  fromParent: boolean;
}

export function useFamilyMe(enabled = true) {
  return useQuery<FamilyMe>({
    queryKey: ["family-space", "me"],
    queryFn: () => api.get(`${base}/me`),
    enabled,
    refetchInterval: (query) => (query.state.data?.role === "child" ? 30_000 : false),
  });
}

function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["family-space"] });
}

export function useFamilySetup() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: () => api.post(`${base}/setup`, { consent: true }), onSuccess: refresh });
}

export function useFamilyMembers() {
  return useQuery<FamilyKid[]>({
    queryKey: ["family-space", "members"],
    queryFn: () => api.get(`${base}/members`).then((d) => d.members),
  });
}

export function useCreateChild() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (data: { name: string; password: string }) => api.post(`${base}/children`, data),
    onSuccess: refresh,
  });
}

export function useResetChildPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => api.patch(`${base}/children/${id}/password`, { password }),
  });
}

export function useDeleteChild() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => api.delete(`${base}/children/${id}`), onSuccess: refresh });
}

export function useSaveSchedules(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (schedules: Schedule[]) =>
      api.fetchPut(`${base}/children/${id}/schedules`, {
        schedules: schedules.map(({ label, days, startMin, endMin, enabled }) => ({ label, days, startMin, endMin, enabled })),
      }),
    onSuccess: refresh,
  });
}

export function useSetOverride(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (data: { kind: "LOCK" | "UNLOCK"; minutes: number }) => api.post(`${base}/children/${id}/override`, data),
    onSuccess: refresh,
  });
}

export function useClearOverride(id: string) {
  const refresh = useRefresh();
  return useMutation({ mutationFn: () => api.delete(`${base}/children/${id}/override`), onSuccess: refresh });
}

export function useThreads() {
  return useQuery<Thread[]>({
    queryKey: ["family-space", "threads"],
    queryFn: () => api.get(`${base}/threads`).then((d) => d.threads),
    refetchInterval: 8000,
  });
}

export function useMessages(key: string) {
  return useQuery<FamilyMessage[]>({
    queryKey: ["family-space", "messages", key],
    queryFn: () => api.get(`${base}/threads/${key}/messages`).then((d) => d.messages),
    refetchInterval: 4000,
  });
}

export function useSendMessage(key: string) {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (body: string) => api.post(`${base}/threads/${key}/messages`, { body }), onSuccess: refresh });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => api.post(`${base}/threads/${key}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-space", "threads"] }),
  });
}