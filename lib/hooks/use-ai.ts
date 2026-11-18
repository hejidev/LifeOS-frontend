"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, streamPost, streamRequest } from "@/lib/api/client";
import type { AssistantContext, ConversationSummary } from "@/types/assistant";

export function useAIContext() {
  return useQuery<AssistantContext>({
    queryKey: ["assistant", "context"],
    queryFn: () => api.get("/ai-assistant/context"),
    staleTime: 1000 * 60,
  });
}

export function useAssistantConversations() {
  return useQuery<ConversationSummary[]>({
    queryKey: ["assistant", "conversations"],
    queryFn: () => api.get("/ai-assistant/conversations").then((d) => d.conversations),
    staleTime: 1000 * 30,
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ai-assistant/conversations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assistant", "conversations"] }),
  });
}

export function useAssistantChat() {
  const qc = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const send = useCallback(
    async (message: string, conversationId: string | null, onDelta: (chunk: string) => void) => {
      const ctrl = new AbortController();
      controller.current = ctrl;
      setIsStreaming(true);
      setError(null);
      let id = conversationId;
      let ok = true;

      try {
        const { reader, headers } = await streamRequest("/ai-assistant/chat", { message, ...(conversationId ? { conversationId } : {}) }, ctrl.signal);
        id = headers.get("X-Conversation-Id") ?? conversationId;
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          onDelta(decoder.decode(value, { stream: true }));
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          ok = false;
          setError((err as Error)?.message ?? "Couldn't reach the assistant");
        }
      } finally {
        controller.current = null;
        setIsStreaming(false);
        void qc.invalidateQueries({ queryKey: ["assistant", "conversations"] });
      }

      return { conversationId: id, ok };
    },
    [qc]
  );

  const stop = useCallback(() => controller.current?.abort(), []);
  const clearError = useCallback(() => setError(null), []);
  return { send, stop, isStreaming, error, clearError };
}

export function useStreamWriting() {
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const generate = useCallback(async (payload: { mode: string; input: string; tone?: string; targetLanguage?: string }) => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setOutput("");
    setError(null);
    setIsStreaming(true);

    try {
      const reader = await streamPost("/ai/writing/stream", payload, ctrl.signal);
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((previous) => previous + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") setError((err as Error)?.message ?? "Failed to generate");
    } finally {
      if (controller.current === ctrl) {
        controller.current = null;
        setIsStreaming(false);
      }
    }
  }, []);

  const stop = useCallback(() => controller.current?.abort(), []);
  const reset = useCallback(() => {
    setOutput("");
    setError(null);
  }, []);

  return { output, setOutput, isStreaming, error, generate, stop, reset };
}