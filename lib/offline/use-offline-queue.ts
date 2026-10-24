"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { queueAdd, queueAll, queueDelete, queueUpdate } from "./db";
import { syncQueue } from "./sync";
import type { QueuedSale, SaleRecord } from "./types";

const RETRY_DELAYS_MS = [5000, 15000, 45000, 120000, 300000];
const SKIPPED_RETRY_MS = 15000;
const PROBE_FIRST_DELAY_MS = 2000;
const PROBE_INTERVAL_MS = 8000;
const PROBE_TIMEOUT_MS = 4000;
const CHANNEL_NAME = "lifeos-sale-queue";
const HEALTH_URL = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api\/?$/, "")}/health`;

type NewEntry = Omit<QueuedSale, "status" | "attempts" | "lastError">;

async function isReachable() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${HEALTH_URL}?t=${Date.now()}`, { mode: "no-cors", cache: "no-store", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useOfflineQueue(scope: string | null) {
  const [entries, setEntries] = useState<QueuedSale[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);

  const scopeRef = useRef(scope);
  const onlineRef = useRef(true);
  const syncingRef = useRef(false);
  const backoffRef = useRef(0);
  const mountedRef = useRef(true);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const probeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const runSyncRef = useRef<() => Promise<void>>(async () => {});
  const markOnlineRef = useRef<() => void>(() => {});
  const markOfflineRef = useRef<() => void>(() => {});

  useEffect(() => {
    scopeRef.current = scope;
  }, [scope]);

  const reload = useCallback(async () => {
    try {
      const rows = await queueAll();
      if (mountedRef.current) setEntries(rows);
      return rows;
    } catch {
      return [] as QueuedSale[];
    }
  }, []);

  const startProbing = useCallback(() => {
    if (probeTimer.current) return;
    const tick = async () => {
      probeTimer.current = null;
      if (!mountedRef.current || onlineRef.current) return;
      if (await isReachable()) {
        markOnlineRef.current();
        return;
      }
      probeTimer.current = setTimeout(tick, PROBE_INTERVAL_MS);
    };
    probeTimer.current = setTimeout(tick, PROBE_FIRST_DELAY_MS);
  }, []);

  const markOffline = useCallback(() => {
    if (!onlineRef.current) return;
    onlineRef.current = false;
    setOnline(false);
    startProbing();
  }, [startProbing]);

  const markOnline = useCallback(() => {
    if (probeTimer.current) {
      clearTimeout(probeTimer.current);
      probeTimer.current = null;
    }
    const wasOnline = onlineRef.current;
    onlineRef.current = true;
    setOnline(true);
    if (!wasOnline) {
      backoffRef.current = 0;
      void runSyncRef.current();
    }
  }, []);

  const markSessionExpired = useCallback(() => setSessionExpired(true), []);

  const runSync = useCallback(async () => {
    const currentScope = scopeRef.current;
    if (!currentScope || syncingRef.current || !onlineRef.current) return;

    syncingRef.current = true;
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    setSyncing(true);

    const outcome = await syncQueue(currentScope).catch(() => ({
      synced: 0,
      retryLater: true,
      sessionExpired: false,
      networkDown: false,
      skipped: false,
    }));

    syncingRef.current = false;
    if (!mountedRef.current) return;
    setSyncing(false);

    const rows = await reload();
    channel.current?.postMessage("changed");

    if (outcome.synced > 0) {
      backoffRef.current = 0;
      setSyncVersion((version) => version + 1);
    }

    if (outcome.sessionExpired) setSessionExpired(true);
    else if (outcome.synced > 0) setSessionExpired(false);

    if (outcome.networkDown) markOfflineRef.current();

    const stillPending = rows.some((row) => row.scope === currentScope && row.status === "pending");
    if (!stillPending || !onlineRef.current) return;

    if (outcome.skipped) {
      retryTimer.current = setTimeout(() => void runSyncRef.current(), SKIPPED_RETRY_MS);
    } else if (outcome.retryLater) {
      const delay = RETRY_DELAYS_MS[Math.min(backoffRef.current, RETRY_DELAYS_MS.length - 1)];
      backoffRef.current += 1;
      retryTimer.current = setTimeout(() => void runSyncRef.current(), delay);
    }
  }, [reload]);

  useEffect(() => {
    runSyncRef.current = runSync;
    markOfflineRef.current = markOffline;
    markOnlineRef.current = markOnline;
  }, [runSync, markOffline, markOnline]);

  useEffect(() => {
    mountedRef.current = true;
    void reload();

    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = () => {
        void reload();
      };
      channel.current = bc;
    }

    const handleOnline = async () => {
      if (await isReachable()) {
        markOnlineRef.current();
        void runSyncRef.current();
      }
    };
    const handleOffline = () => markOfflineRef.current();
    const handleVisible = () => {
      if (document.visibilityState === "visible") void runSyncRef.current();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisible);
    if (!navigator.onLine) markOfflineRef.current();

    return () => {
      mountedRef.current = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisible);
      channel.current?.close();
      channel.current = null;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (probeTimer.current) clearTimeout(probeTimer.current);
      retryTimer.current = null;
      probeTimer.current = null;
    };
  }, [reload]);

  useEffect(() => {
    if (scope) void runSync();
  }, [scope, runSync]);

  const enqueue = useCallback(
    async (entry: NewEntry) => {
      await queueAdd({ ...entry, status: "pending", attempts: 0, lastError: null });
      await reload();
      channel.current?.postMessage("changed");
      backoffRef.current = 0;
      void runSyncRef.current();
    },
    [reload]
  );

  const syncNow = useCallback(async () => {
    backoffRef.current = 0;
    await runSyncRef.current();
  }, []);

  const retry = useCallback(
    async (id: string) => {
      await queueUpdate(id, { status: "pending", attempts: 0, lastError: null });
      await reload();
      backoffRef.current = 0;
      void runSyncRef.current();
    },
    [reload]
  );

  const discard = useCallback(
    async (id: string) => {
      await queueDelete(id);
      await reload();
      channel.current?.postMessage("changed");
    },
    [reload]
  );

  const scoped = useMemo(() => entries.filter((entry) => entry.scope === scope), [entries, scope]);
  const pending = useMemo(() => scoped.filter((entry) => entry.status === "pending"), [scoped]);
  const failed = useMemo(() => scoped.filter((entry) => entry.status === "failed"), [scoped]);
  const isSalePending = useCallback(
    (sale: SaleRecord) => scoped.some((entry) => `local-${entry.id}` === sale.id),
    [scoped]
  );

  return {
    online,
    syncing,
    sessionExpired,
    entries: scoped,
    pending,
    failed,
    foreignCount: scope ? entries.length - scoped.length : 0,
    syncVersion,
    markOffline,
    markSessionExpired,
    enqueue,
    syncNow,
    retry,
    discard,
    isSalePending,
  };
}