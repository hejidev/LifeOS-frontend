"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getSocket } from "@/lib/socket";

export function useConversations() {
  return useQuery({ queryKey: ["conversations"], queryFn: () => api.get("/messages/conversations").then((d) => d.conversations) });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => api.get(`/messages/${conversationId}/messages`).then((d) => d.messages),
    enabled: !!conversationId,
  });
}

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; message: string }) => api.post("/messages/start", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) => api.post(`/messages/${conversationId}/messages`, { body }),
    onSuccess: (_d, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useLiveMessages(activeConversationId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleNew(msg: any) {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (msg.conversationId === activeConversationId) qc.invalidateQueries({ queryKey: ["messages", activeConversationId] });
    }
    socket.on("message:new", handleNew);
    return () => { socket.off("message:new", handleNew); };
  }, [qc, activeConversationId]);
}

export function useContactSupport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => api.post("/messages/contact-support", { message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}