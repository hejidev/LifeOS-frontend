"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface SearchResult {
  id: string;
  type: "task" | "note" | "document" | "goal" | "habit" | "study" | "event" | "vault" | "transaction" | "career";
  title: string;
  subtitle?: string;
  href: string;
}

export function useGlobalSearch(query: string) {
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(timer);
  }, [query]);

  const enabled = debounced.length >= 2;
  const request = useQuery<SearchResult[]>({
    queryKey: ["globalSearch", debounced],
    queryFn: () => api.get(`/discover/search?q=${encodeURIComponent(debounced)}`).then((d) => d.results),
    enabled,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  return { results: enabled ? request.data ?? [] : [], isFetching: enabled && request.isFetching, isError: enabled && request.isError };
}

export interface SetupStep {
  key: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

export function useSetupStatus() {
  return useQuery<{ steps: SetupStep[]; completed: number; total: number }>({
    queryKey: ["setupStatus"],
    queryFn: () => api.get("/discover/setup"),
    staleTime: 1000 * 60,
  });
}

export interface DailyBrief {
  brief: string | null;
  generatedAt?: string;
  date?: string;
}

export function useDailyBrief() {
  return useQuery<DailyBrief>({
    queryKey: ["dailyBrief"],
    queryFn: () => api.get("/ai-assistant/brief"),
    staleTime: 1000 * 60 * 10,
  });
}

export function useGenerateBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/ai-assistant/brief") as Promise<DailyBrief>,
    onSuccess: (data) => qc.setQueryData(["dailyBrief"], data),
  });
}