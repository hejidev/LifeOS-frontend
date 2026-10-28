"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface ChatThread {
  id: string;
  kind: "TEAM" | "DIRECT";
  title: string;
  subtitle?: string | null;
  unread: number;
  lastMessage: { body: string; senderName: string; createdAt: string } | null;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderType: "OWNER" | "STAFF";
  senderId: string;
  senderName: string;
  body: string;
  attachment?: { type: "PRODUCT" | "SALE"; id: string; title: string; subtitle: string; detail: string } | null;
  createdAt: string;
}

const enc = encodeURIComponent;

export function useChatThreads() {
  return useQuery<ChatThread[]>({
    queryKey: ["chatThreads"],
    queryFn: () => api.get("/merchant/chat/threads").then((d) => d.threads),
    refetchInterval: 8000,
  });
}

export function useChatMessages(threadId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ["chatMessages", threadId],
    queryFn: () => api.get(`/merchant/chat/threads/${enc(threadId as string)}/messages`).then((d) => d.messages),
    enabled: !!threadId,
    refetchInterval: 4000,
  });
}

export function useChatUnread() {
  return useQuery<number>({
    queryKey: ["chatUnread"],
    queryFn: () => api.get("/merchant/chat/unread-count").then((d) => d.count),
    refetchInterval: 20000,
  });
}

export function useSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: string }) =>
      api.post(`/merchant/chat/threads/${enc(threadId)}/messages`, { body }),
    onSuccess: (_data, { threadId }) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", threadId] });
      qc.invalidateQueries({ queryKey: ["chatThreads"] });
    },
  });
}

export function useMarkChatRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => api.post(`/merchant/chat/threads/${enc(threadId)}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatThreads"] });
      qc.invalidateQueries({ queryKey: ["chatUnread"] });
    },
  });
}