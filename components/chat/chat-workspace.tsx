"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, MessageSquare, Package, Paperclip, Receipt, Send, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AttachmentRef, ChatMessage, ChatThread } from "@/lib/hooks/use-chat";
import { AttachPicker } from "./attach-picker";
import type { AttachPickers } from "./attach-picker";

interface ChatWorkspaceProps {
  threads: ChatThread[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  messages: ChatMessage[];
  loading: boolean;
  isMine: (message: ChatMessage) => boolean;
  onSend: (body: string, attachment?: AttachmentRef) => Promise<void>;
  pickers?: AttachPickers;
  className?: string;
  fullscreenOnMobile?: boolean;
}

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; message: ChatMessage; mine: boolean; first: boolean; last: boolean };

const GROUP_GAP = 5 * 60_000;

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function hueOf(text: string) {
  let hue = 0;
  for (const char of text) hue = (hue * 31 + char.charCodeAt(0)) % 360;
  return hue;
}

function Avatar({ thread, size = "md" }: { thread: ChatThread; size?: "md" | "sm" }) {
  const box = size === "md" ? "h-11 w-11" : "h-9 w-9";
  if (thread.kind === "TEAM") {
    return <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500 text-white", box)}><Users className="h-4 w-4" /></span>;
  }
  const hue = hueOf(thread.title);
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", box)} style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 45%), hsl(${(hue + 40) % 360} 60% 35%))` }}>
      {thread.title.slice(0, 1).toUpperCase()}
    </span>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

function useVisualViewport(enabled: boolean) {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) {
      setBox(null);
      return;
    }
    const sync = () => setBox({ top: viewport.offsetTop, height: viewport.height });
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, [enabled]);
  return box;
}

export function ChatWorkspace({ threads, activeId, onSelect, messages, loading, isMine, onSend, pickers, className, fullscreenOnMobile = true }: ChatWorkspaceProps) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{ ref: AttachmentRef; label: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);

  const active = threads.find((thread) => thread.id === activeId) ?? null;
  const isMobile = useMediaQuery("(max-width: 767px)");
  const takeover = !!active && isMobile && fullscreenOnMobile;
  const viewport = useVisualViewport(takeover);
  const totalUnread = threads.reduce((sum, thread) => sum + thread.unread, 0);

  useEffect(() => {
    if (!takeover) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [takeover]);

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index];
      const previous = messages[index - 1];
      const next = messages[index + 1];
      const day = dayLabel(message.createdAt);
      if (!previous || dayLabel(previous.createdAt) !== day) out.push({ kind: "day", key: `day-${message.id}`, label: day });

      const sameAsPrevious =
        !!previous &&
        dayLabel(previous.createdAt) === day &&
        previous.senderType === message.senderType &&
        previous.senderId === message.senderId &&
        new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_GAP;
      const sameAsNext =
        !!next &&
        dayLabel(next.createdAt) === day &&
        next.senderType === message.senderType &&
        next.senderId === message.senderId &&
        new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime() < GROUP_GAP;

      out.push({ kind: "message", key: message.id, message, mine: isMine(message), first: !sameAsPrevious, last: !sameAsNext });
    }
    return out;
  }, [messages, isMine]);

  function toBottom(smooth = false) {
    const element = scroller.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  function onScroll() {
    const element = scroller.current;
    if (!element) return;
    const near = element.scrollHeight - element.scrollTop - element.clientHeight < 140;
    stick.current = near;
    setShowJump(!near);
  }

  const lastMessage = messages[messages.length - 1];
  const lastMine = lastMessage ? isMine(lastMessage) : false;

  useLayoutEffect(() => {
    if (stick.current || lastMine) toBottom(true);
    else setShowJump(true);
  }, [messages.length, lastMine]);

  useEffect(() => {
    stick.current = true;
    setShowJump(false);
    setPending(null);
    setProblem(null);
    const frame = requestAnimationFrame(() => toBottom());
    return () => cancelAnimationFrame(frame);
  }, [activeId]);

  useLayoutEffect(() => {
    const element = composer.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 128)}px`;
  }, [draft, activeId]);

  async function submit() {
    const body = draft.trim();
    if ((!body && !pending) || sending) return;
    setSending(true);
    setProblem(null);
    try {
      await onSend(body, pending?.ref);
      setDraft("");
      setPending(null);
      stick.current = true;
      composer.current?.focus();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Couldn't send that.");
    } finally {
      setSending(false);
    }
  }

  const ready = !!draft.trim() || !!pending;

  return (
    <div className={cn("grid min-h-0 grid-cols-1 overflow-hidden rounded-2xl border bg-card md:grid-cols-[300px_1fr]", className)}>
      <aside className={cn("min-h-0 flex-col overflow-hidden md:flex md:border-r", active && !fullscreenOnMobile ? "hidden md:flex" : "flex", takeover && "hidden")}>
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Messages</p>
          {totalUnread > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{totalUnread} new</span> : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelect(thread.id)}
                className={cn("flex w-full items-center gap-3 border-b border-border/60 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted", thread.id === activeId && "bg-muted")}
              >
                <Avatar thread={thread} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", thread.unread > 0 ? "font-semibold" : "font-medium")}>{thread.title}</p>
                    {thread.lastMessage ? <span className="shrink-0 text-[10px] text-muted-foreground">{clock(thread.lastMessage.createdAt)}</span> : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-xs", thread.unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {thread.lastMessage ? `${thread.lastMessage.senderName}: ${thread.lastMessage.body}` : thread.subtitle ?? "No messages yet"}
                    </p>
                    {thread.unread > 0 ? <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{thread.unread}</span> : null}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section
        className={cn(
          "min-h-0 min-w-0 flex-col bg-background",
          takeover ? "fixed inset-x-0 top-0 z-50 flex" : active ? "flex" : "hidden md:flex"
        )}
        style={takeover && viewport ? { top: viewport.top, height: viewport.height, bottom: "auto" } : takeover ? { bottom: 0 } : undefined}
      >
        {active ? (
          <>
            <header className="flex shrink-0 items-center gap-2 border-b bg-card/80 px-2 py-2.5 backdrop-blur md:px-4" style={takeover ? { paddingTop: "max(0.625rem, env(safe-area-inset-top))" } : undefined}>
              <Button type="button" size="icon" variant="ghost" className="md:hidden" aria-label="Back to conversations" onClick={() => onSelect(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar thread={active} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{active.title}</p>
                {active.subtitle ? <p className="truncate text-xs capitalize text-muted-foreground">{active.subtitle}</p> : null}
              </div>
            </header>

            <div className="relative min-h-0 flex-1">
              <div ref={scroller} onScroll={onScroll} className="h-full space-y-0.5 overflow-y-auto overscroll-contain px-3 py-4 md:px-5">
                {loading && messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No messages yet. Say hello.</p>
                  </div>
                ) : (
                  rows.map((row) => {
                    if (row.kind === "day") {
                      return (
                        <div key={row.key} className="flex justify-center py-3">
                          <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">{row.label}</span>
                        </div>
                      );
                    }

                    const { message, mine, first, last } = row;
                    return (
                      <div key={row.key} className={cn("flex", mine ? "justify-end" : "justify-start", first && "pt-2")}>
                        <div
                          className={cn(
                            "max-w-[82%] px-3.5 py-2 text-sm shadow-sm md:max-w-[70%]",
                            mine ? "bg-primary text-primary-foreground" : "bg-muted",
                            mine ? (first ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-r-md") : first ? "rounded-2xl rounded-bl-md" : "rounded-2xl rounded-l-md",
                            mine && last && "rounded-br-md"
                          )}
                        >
                          {!mine && first && active.kind === "TEAM" ? <p className="mb-0.5 text-[11px] font-semibold text-primary">{message.senderName}</p> : null}
                          {message.attachment ? (
                            <div className={cn("mb-1.5 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs", mine ? "border-primary-foreground/25 bg-primary-foreground/10" : "border-border bg-background")}>
                              <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", mine ? "bg-primary-foreground/15" : "bg-primary/10 text-primary")}>
                                {message.attachment.type === "PRODUCT" ? <Package className="h-3.5 w-3.5" /> : <Receipt className="h-3.5 w-3.5" />}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold">{message.attachment.title}</p>
                                <p className="opacity-80">{message.attachment.subtitle}</p>
                                <p className="opacity-70">{message.attachment.detail}</p>
                              </div>
                            </div>
                          ) : null}
                          {message.body ? <p className="whitespace-pre-wrap break-words leading-snug">{message.body}</p> : null}
                          {last ? <p className={cn("mt-1 text-right text-[10px]", mine ? "text-primary-foreground/65" : "text-muted-foreground")}>{clock(message.createdAt)}</p> : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {showJump ? (
                <button
                  type="button"
                  onClick={() => toBottom(true)}
                  className="absolute bottom-3 right-4 flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-lg"
                >
                  <ArrowDown className="h-3.5 w-3.5" /> Latest
                </button>
              ) : null}
            </div>

            {problem ? <p className="shrink-0 px-4 pb-1 text-center text-xs text-destructive">{problem}</p> : null}
            {pending ? (
              <div className="mx-3 mb-2 flex shrink-0 items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs">
                {pending.ref.type === "PRODUCT" ? <Package className="h-3.5 w-3.5 text-primary" /> : <Receipt className="h-3.5 w-3.5 text-primary" />}
                <span className="flex-1 truncate font-medium">{pending.label}</span>
                <button type="button" onClick={() => setPending(null)} aria-label="Remove attachment"><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
              className="flex shrink-0 items-end gap-2 border-t bg-card/80 p-2.5 backdrop-blur md:p-3"
              style={takeover ? { paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" } : undefined}
            >
              {pickers ? (
                <Button type="button" size="icon" variant="ghost" className="shrink-0" onClick={() => setPicking(true)} aria-label="Attach a product or sale">
                  <Paperclip className="h-5 w-5" />
                </Button>
              ) : null}
              <Textarea
                ref={composer}
                rows={1}
                value={draft}
                maxLength={2000}
                placeholder="Write a message"
                enterKeyHint={isMobile ? "enter" : "send"}
                className="max-h-32 min-h-10 resize-none rounded-2xl py-2.5 text-base md:text-sm"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !isMobile) {
                    event.preventDefault();
                    void submit();
                  }
                }}
              />
              <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-full" disabled={!ready || sending} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </form>

            {pickers ? <AttachPicker open={picking} onOpenChange={setPicking} pickers={pickers} onPick={(ref, label) => setPending({ ref, label })} /> : null}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="h-9 w-9 opacity-40" />
            <p className="text-sm">Choose a conversation</p>
          </div>
        )}
      </section>
    </div>
  );
}