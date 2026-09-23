"use client";

import { useEffect, useRef, useCallback } from "react";

export interface PosDisplayLine {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PosDisplayState {
  businessName: string;
  currency: string;
  lines: PosDisplayLine[];
  discount: number;
  total: number;
  status: "shopping" | "paid" | "idle";
  servedBy?: string;
}

export function usePosDisplayBroadcast(sessionId: string | null) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    const channel = new BroadcastChannel(`lifeos-pos-${sessionId}`);
    channelRef.current = channel;
    return () => {
      channel.close();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [sessionId]);

  const publish = useCallback((state: PosDisplayState) => {
    if (!channelRef.current) return;
    try {
      channelRef.current.postMessage(state);
    } catch {
      // Channel closed between the check above and this call — safe to
      // ignore, there's nothing left listening on the other end.
    }
  }, []);

  return { publish };
}

export function usePosDisplayReceiver(sessionId: string | null, onMessage: (state: PosDisplayState) => void) {
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    const channel = new BroadcastChannel(`lifeos-pos-${sessionId}`);
    channel.onmessage = (e) => onMessage(e.data);
    return () => channel.close();
  }, [sessionId, onMessage]);
}