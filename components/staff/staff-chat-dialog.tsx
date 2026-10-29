"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { staffApi } from "@/lib/api/staff-client";
import type { AttachmentRef, ChatMessage, ChatThread, PickItem } from "@/lib/hooks/use-chat";

const OPTIONS = { redirectOnExpire: false, timeoutMs: 8000 };
const enc = encodeURIComponent;

export function useStaffChatUnread(enabled: boolean) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const result = await staffApi.get<{ count: number }>("/staff-chat/unread-count", OPTIONS);
        if (!cancelled) setCount(result.count);
      } catch {
        return;
      }
    };
    void load();
    const timer = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);
  
  return count;
}

interface StaffChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  enabled: boolean;
}

export function StaffChatDialog({ open, onOpenChange, staffId, enabled }: StaffChatDialogProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [products, setProducts] = useState<PickItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      const result = await staffApi.get<{ threads: ChatThread[] }>("/staff-chat/threads", OPTIONS);
      setThreads(result.threads);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!open || !enabled) return;
    void loadThreads();
    const timer = setInterval(loadThreads, 10000);
    return () => clearInterval(timer);
  }, [open, enabled, loadThreads]);

  useEffect(() => {
    if (open && !activeId && threads.length > 0) setActiveId(threads[0].id);
  }, [open, activeId, threads]);

  useEffect(() => {
    if (!open || !enabled) return;
    staffApi
      .get<{ products: { id: string; name: string; price: number; stock: number }[] }>("/staff-pos/products", OPTIONS)
      .then((result) =>
        setProducts(
          result.products.map((product) => ({
            id: product.id,
            title: product.name,
            subtitle: `${Number(product.price).toLocaleString()} · ${product.stock} in stock`,
          }))
        )
      )
      .catch(() => undefined);
  }, [open, enabled]);

  useEffect(() => {
    if (!open || !enabled || !activeId) return;
    let cancelled = false;
    setMessages([]);
    setLoading(true);

    const load = async () => {
      try {
        const result = await staffApi.get<{ messages: ChatMessage[] }>(`/staff-chat/threads/${enc(activeId)}/messages`, OPTIONS);
        if (!cancelled) setMessages(result.messages);
      } catch {
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const timer = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [open, enabled, activeId]);

  const lastId = messages[messages.length - 1]?.id;

  useEffect(() => {
    if (!open || !enabled || !activeId || !lastId) return;
    staffApi
      .post(`/staff-chat/threads/${enc(activeId)}/read`, undefined, OPTIONS)
      .then(loadThreads)
      .catch(() => undefined);
  }, [open, enabled, activeId, lastId, loadThreads]);

  async function send(body: string, attachment?: AttachmentRef) {
    if (!activeId) return;
    const result = await staffApi.post<{ message: ChatMessage }>(`/staff-chat/threads/${enc(activeId)}/messages`, { body, attachment }, OPTIONS);
    setMessages((current) => (current.some((item) => item.id === result.message.id) ? current : [...current, result.message]));
    void loadThreads();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-w-3xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Team chat</DialogTitle>
        </DialogHeader>
        {enabled ? (
          <ChatWorkspace
            className="flex-1"
            threads={threads}
            pickers={{ products }}
            activeId={activeId}
            onSelect={setActiveId}
            messages={messages}
            loading={loading}
            isMine={(message) => message.senderType === "STAFF" && message.senderId === staffId}
            onSend={send}
          />
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">Chat needs an internet connection.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}