"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConversations, useMessages, useSendMessage, useLiveMessages } from "@/lib/hooks/use-messages";

export function MessagesInbox() {
  const searchParams = useSearchParams();
  const { data: conversations = [] } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: messages = [] } = useMessages(activeId);
  const sendMessage = useSendMessage();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const fromUrl = searchParams.get("conversation");
    if (fromUrl) setActiveId(fromUrl);
  }, [searchParams]);

  useLiveMessages(activeId);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    sendMessage.mutate({ conversationId: activeId, body: draft }, { onSuccess: () => setDraft("") });
  }

  const active = (conversations as any[]).find((c) => c.id === activeId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-10rem)]">
      <Card className="md:col-span-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border shrink-0">
          <p className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(conversations as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">No conversations yet.</p>
          ) : (
            (conversations as any[]).map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn("w-full text-left px-3 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors", activeId === c.id && "bg-primary/5")}
              >
                <p className="text-sm font-medium truncate">{c.participant.name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.lastMessage ?? "No messages yet"}</p>
              </button>
            ))
          )}
        </div>
      </Card>

      <Card className="md:col-span-2 flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a conversation</div>
        ) : (
          <>
            <div className="p-3 border-b border-border shrink-0">
              <p className="text-sm font-medium">{active.participant.name}</p>
              <p className="text-xs text-muted-foreground">{active.participant.email}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(messages as any[]).map((m) => (
                <div key={m.id} className={cn("max-w-[75%] rounded-lg px-3 py-2 text-sm", m.senderId === active.participant.id ? "bg-muted/40" : "bg-primary text-primary-foreground ml-auto")}>
                  {m.body}
                </div>
              ))}
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2 shrink-0">
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a reply..." />
              <Button type="submit" size="icon" disabled={sendMessage.isPending}><Send className="h-4 w-4" /></Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}