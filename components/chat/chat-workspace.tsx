"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Package, Receipt, Send, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatThread } from "@/lib/hooks/use-chat";

interface ChatWorkspaceProps {
    threads: ChatThread[];
    activeId: string | null;
    onSelect: (id: string | null) => void;
    messages: ChatMessage[];
    loading: boolean;
    isMine: (message: ChatMessage) => boolean;
    onSend: (body: string) => Promise<void>;
    className?: string;
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function ChatWorkspace({ threads, activeId, onSelect, messages, loading, isMine, onSend, className }: ChatWorkspaceProps) {
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const active = threads.find((thread) => thread.id === activeId) ?? null;

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: "end" });
    }, [messages.length, activeId]);

    async function submit() {
        const body = draft.trim();
        if (!body || sending) return;
        setSending(true);
        try {
            await onSend(body);
            setDraft("");
        } finally {
            setSending(false);
        }
    }

    return (
        <div className={cn("grid min-h-0 grid-cols-1 overflow-hidden rounded-xl border bg-card md:grid-cols-[280px_1fr]", className)}>
            <aside className={cn("min-h-0 overflow-y-auto border-b md:border-b-0 md:border-r", active ? "hidden md:block" : "block")}>
                {threads.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
                ) : (
                    threads.map((thread) => (
                        <button
                            key={thread.id}
                            onClick={() => onSelect(thread.id)}
                            className={cn(
                                "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50",
                                thread.id === activeId && "bg-muted"
                            )}
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                {thread.kind === "TEAM" ? <Users className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{thread.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {thread.lastMessage ? `${thread.lastMessage.senderName}: ${thread.lastMessage.body}` : thread.subtitle ?? "No messages yet"}
                                </p>
                            </div>
                            {thread.unread > 0 ? (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                                    {thread.unread}
                                </span>
                            ) : null}
                        </button>
                    ))
                )}
            </aside>

            <section className={cn("min-h-0 flex-col", active ? "flex" : "hidden md:flex")}>
                {active ? (
                    <>
                        <header className="flex items-center gap-2 border-b px-4 py-3">
                            <Button size="sm" variant="ghost" className="md:hidden" onClick={() => onSelect(null)}>
                                Back
                            </Button>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{active.title}</p>
                                {active.subtitle ? <p className="truncate text-xs text-muted-foreground">{active.subtitle}</p> : null}
                            </div>
                        </header>

                        <div className="flex-1 space-y-2 overflow-y-auto p-4">
                            {loading && messages.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
                            ) : messages.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
                            ) : (
                                messages.map((message) => {
                                    const mine = isMine(message);
                                    return (
                                        <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                                            <div
                                                className={cn(
                                                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                                                    mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted"
                                                )}
                                            >
                                                {!mine ? <p className="mb-0.5 text-[11px] font-semibold text-primary">{message.senderName}</p> : null}
                                                {message.attachment ? (
                                                    <div
                                                        className={cn(
                                                            "mb-1 flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs",
                                                            mine ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border bg-background"
                                                        )}
                                                    >
                                                        {message.attachment.type === "PRODUCT" ? <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Receipt className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                                                        <div className="min-w-0">
                                                            <p className="font-semibold">{message.attachment.title}</p>
                                                            <p className="opacity-80">{message.attachment.subtitle}</p>
                                                            <p className="opacity-70">{message.attachment.detail}</p>
                                                        </div>
                                                    </div>
                                                ) : null}
                                                {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                                                <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{clock(message.createdAt)}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={bottomRef} />
                        </div>

                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                void submit();
                            }}
                            className="flex items-end gap-2 border-t p-3"
                        >
                            <Textarea
                                rows={1}
                                value={draft}
                                maxLength={2000}
                                placeholder="Write a message…"
                                className="max-h-32 min-h-10 resize-none"
                                onChange={(event) => setDraft(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && !event.shiftKey) {
                                        event.preventDefault();
                                        void submit();
                                    }
                                }}
                            />
                            <Button type="submit" size="icon" disabled={!draft.trim() || sending}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 opacity-40" />
                        <p className="text-sm">Choose a conversation</p>
                    </div>
                )}
            </section>
        </div>
    );
}