"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

const base = "/platform-tools";

export interface Latency {
  requests: number;
  clientErrors: number;
  serverErrors: number;
  avgMs: number;
  p50: number;
  p95: number;
  p99: number;
  maxMs: number;
}

export interface TrafficOverview {
  window: string;
  stepMs: number;
  since: string;
  until: string;
  totals: Latency & { rps: number };
  areas: (Latency & { area: string })[];
  series: { t: string; requests: number; clientErrors: number; serverErrors: number; byArea: Record<string, number> }[];
  instances: { instance: string; requests: number; share: number }[];
  routes: { route: string; requests: number; avgMs: number; maxMs: number; serverErrors: number; clientErrors: number }[];
}

export interface InstanceInfo {
  instance: string;
  current: boolean;
  live: boolean;
  bootedAt: string;
  lastSeenAt: string;
  uptimeSec: number;
  rssMb: number;
  heapMb: number;
  loopLagMs: number;
  dbPingMs: number;
  requests: number;
}

export interface ProbeResult {
  requests: number;
  failed: number;
  avgMs: number;
  p95: number;
  instances: { instance: string; requests: number; share: number }[];
}

export interface FixtureStatus {
  user: { exists: boolean; email: string };
  admin: { exists: boolean; email: string };
  merchant: { exists: boolean; email: string; products: number; customers: number; sales: number; ready: boolean };
}

export interface RunSnapshot {
  serverHealth: any;
  elapsedSec: number;
  activeWorkers: number;
  requests: number;
  failed: number;
  limited: number;
  rps: number;
  avgMs: number;
  p50: number;
  p95: number;
  p99: number;
  maxMs: number;
  endpoints: { target: string; label: string; requests: number; failed: number; limited: number; avgMs: number; p50: number; p95: number; p99: number; maxMs: number }[];
  targets: { target: string; label: string; requests: number; failed: number; avgMs: number; p95: number }[];
  timeline: { second: number; requests: number; failed: number; avgMs: number }[];
  instances: { instance: string; requests: number; share: number }[];
  verdict?: "healthy" | "degraded" | "failing";
  hints?: string[];
  warnings?: string[];
  stoppedReason?: string | null;
  error?: string;
}

export interface LoadTestRun {
  id: string;
  status: "RUNNING" | "COMPLETED" | "STOPPED" | "FAILED";
  createdAt: string;
  finishedAt: string | null;
  createdByName: string;
  config: { targets: string[]; concurrency: number; durationSec: number; rampUpSec: number };
  progress: RunSnapshot | null;
  result: RunSnapshot | null;
}

export interface LoadTestSummary {
  id: string;
  status: string;
  createdAt: string;
  createdByName: string;
  config: LoadTestRun["config"];
  verdict: string | null;
  requests: number | null;
  p95: number | null;
}

export interface AccountSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  merchant: { businessName: string; status: string; planTier: string | null; planStatus: string | null; paused: boolean } | null;
}

export interface Queues {
  pending: { userId: string; businessName: string; detail: string }[];
  pastDue: { userId: string; businessName: string; detail: string }[];
  suspended: { userId: string; businessName: string; detail: string }[];
  paused: { userId: string; businessName: string; detail: string }[];
}

export interface AccountDetail {
    identity: { id: string; name: string; email: string; role: string; isActive: boolean; emailVerified: boolean; provider: string | null; twoFactor: boolean; createdAt: string };
    landing: { label: string; path: string };
    checks: { label: string; ok: boolean; detail: string }[];
    merchant: {
      profileId: string;
      businessName: string;
      status: string;
      planTier: string | null;
      planStatus: string | null;
      paused: boolean;
      currency: string;
      currentPeriodEnd: string | null;
      storeCode: string | null;
      appliedAt: string;
      stats: {
        products: number;
        customers: number;
        stores: number;
        staffActive: number;
        staffSuspended: number;
        sales30d: number;
        revenue30d: number;
        owedCount: number;
        owedTotal: number;
        needsReview: number;
        openRegisters: number;
        lastSaleAt: string | null;
      };
    } | null;
    notes: { id: string; body: string; authorName: string; createdAt: string }[];
    signIns: { failures24h: number; recent: { id: string; success: boolean; ipAddress: string | null; userAgent: string | null; createdAt: string }[] };
    audit: { id: string; action: string; description: string; adminName: string; createdAt: string }[];
    conversations: { id: string; with: string; lastMessageAt: string; messages: { id: string; fromUser: boolean; body: string; createdAt: string }[] }[];
    serverHealth?: { loopLagP99Ms: number; dbPingAvgMs: number; dbPingMaxMs: number };
  }

export function useTraffic(windowKey: string) {
  return useQuery<TrafficOverview>({
    queryKey: ["tools", "traffic", windowKey],
    queryFn: () => api.get(`${base}/traffic?window=${windowKey}`),
    refetchInterval: 10000,
  });
}

export function useInstances() {
  return useQuery<InstanceInfo[]>({
    queryKey: ["tools", "instances"],
    queryFn: () => api.get(`${base}/instances`).then((d) => d.instances),
    refetchInterval: 10000,
  });
}

export function useBalanceProbe() {
  return useMutation({ mutationFn: () => api.post(`${base}/balance-probe`) as Promise<ProbeResult> });
}

export function useFixtures() {
  return useQuery<FixtureStatus>({ queryKey: ["tools", "fixtures"], queryFn: () => api.get(`${base}/fixtures`) });
}

export function useSeedFixtures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`${base}/fixtures/seed`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tools", "fixtures"] }),
  });
}

export function useLoadTests() {
  return useQuery<LoadTestSummary[]>({
    queryKey: ["tools", "runs"],
    queryFn: () => api.get(`${base}/load-tests`).then((d) => d.runs),
    refetchInterval: 15000,
  });
}

export function useLoadTest(id: string | null) {
  return useQuery<LoadTestRun>({
    queryKey: ["tools", "run", id],
    queryFn: () => api.get(`${base}/load-tests/${id}`),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === "RUNNING" ? 1500 : false),
  });
}

export function useStartLoadTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: LoadTestRun["config"]) => api.post(`${base}/load-tests`, config).then((d) => d.id as string),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tools", "runs"] }),
  });
}

export function useStopLoadTest() {
  return useMutation({ mutationFn: (id: string) => api.post(`${base}/load-tests/${id}/stop`) });
}

export function useSupportQueues() {
  return useQuery<Queues>({ queryKey: ["tools", "queues"], queryFn: () => api.get(`${base}/support/queues`), refetchInterval: 60000 });
}

export function useSupportSearch(term: string) {
  return useQuery<AccountSummary[]>({
    queryKey: ["tools", "search", term],
    queryFn: () => api.get(`${base}/support/search?q=${encodeURIComponent(term)}`).then((d) => d.accounts),
    enabled: term.length >= 2,
  });
}

export function useSupportAccount(id: string | null) {
  return useQuery<AccountDetail>({
    queryKey: ["tools", "account", id],
    queryFn: () => api.get(`${base}/support/accounts/${id}`),
    enabled: !!id,
  });
}

export function useAddSupportNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.post(`${base}/support/accounts/${id}/notes`, { body }),
    onSuccess: (_data, { id }) => qc.invalidateQueries({ queryKey: ["tools", "account", id] }),
  });
}

export function useDeleteSupportNote(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => api.delete(`${base}/support/notes/${noteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tools", "account", accountId] }),
  });
}

export function useMerchantAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: string; reason: string }) =>
      api.post(`${base}/support/accounts/${id}/merchant-action`, { action, reason }) as Promise<{ storeCode?: string }>,
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ["tools", "account", id] });
      void qc.invalidateQueries({ queryKey: ["tools", "queues"] });
    },
  });
}

export function useRemoveFixtures() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: () => api.delete(`${base}/fixtures`) as Promise<{ removed: number }>,
      onSuccess: () => qc.invalidateQueries({ queryKey: ["tools", "fixtures"] }),
    });
  }
  
  export function useMessageUser() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ userId, message }: { userId: string; message: string }) => api.post("/messages/start", { userId, message }),
      onSuccess: (_data, { userId }) => qc.invalidateQueries({ queryKey: ["tools", "account", userId] }),
    });
  }