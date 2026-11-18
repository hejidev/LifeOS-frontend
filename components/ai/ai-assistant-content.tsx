"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { Calendar, Check, CheckSquare, Copy, FileText, History, Loader2, MessageSquare, Plus, Send, Sparkles, Square, Trash2, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { useCreateCalendarEvent, useCreateFinanceTransaction, useCreateNote, useCreateTask } from "@/lib/hooks/use-life-data";
import { useAIContext, useAssistantChat, useAssistantConversations, useDeleteConversation } from "@/lib/hooks/use-ai";
import { useMoney } from "@/lib/hooks/use-currency";
import { cn } from "@/lib/utils";
import type { AssistantAction, AssistantContext, StoredMessage } from "@/types/assistant";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const ACTION_BLOCK = /```lifeos-action\s*([\s\S]*?)```/;
const CONFIRMED_KEY = "lifeos:assistant:confirmed";

function confirmedList(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CONFIRMED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function remember(key: string) {
  try {
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify([...confirmedList(), key].slice(-200)));
  } catch {}
}

function toAction(raw: unknown): AssistantAction | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);
  const localTime = (value: unknown) => (typeof value === "string" && !Number.isNaN(new Date(value).getTime()) ? value : null);

  switch (a.type) {
    case "create_task": {
      const title = text(a.title, 200);
      if (!title) return null;
      const dueDate = typeof a.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) ? a.dueDate : undefined;
      const priority = (["P1", "P2", "P3", "P4"] as const).find((p) => p === a.priority) ?? "P3";
      return { type: "create_task", title, dueDate, priority };
    }
    case "create_note": {
      const title = text(a.title, 200);
      const content = typeof a.content === "string" ? a.content.slice(0, 20_000) : "";
      return title ? { type: "create_note", title, content } : null;
    }
    case "log_transaction": {
      const description = text(a.description, 255);
      const amount = Number(a.amount);
      const kind = a.kind === "income" ? "income" : a.kind === "expense" ? "expense" : null;
      return description && kind && Number.isFinite(amount) && amount > 0 ? { type: "log_transaction", kind, amount, description } : null;
    }
    case "create_event": {
      const title = text(a.title, 150);
      const start = localTime(a.start);
      if (!title || !start) return null;
      const end = localTime(a.end) ?? new Date(new Date(start).getTime() + 3_600_000).toISOString();
      return { type: "create_event", title, start, end: new Date(end) < new Date(start) ? start : end, location: text(a.location, 200) ?? undefined };
    }
    default:
      return null;
  }
}

function splitMessage(content: string) {
  const match = content.match(ACTION_BLOCK);
  if (match) {
    let action: AssistantAction | null = null;
    try {
      action = toAction(JSON.parse(match[1]));
    } catch {}
    return { text: content.replace(ACTION_BLOCK, "").trim(), action, key: match[1].trim() };
  }
  const open = content.indexOf("```lifeos-action");
  return { text: (open >= 0 ? content.slice(0, open) : content).trim(), action: null, key: "" };
}

function ActionCard({ action, fingerprint }: { action: AssistantAction; fingerprint: string }) {
  const { money } = useMoney();
  const createTask = useCreateTask();
  const createNote = useCreateNote();
  const createTransaction = useCreateFinanceTransaction();
  const createEvent = useCreateCalendarEvent();
  const [state, setState] = useState<"idle" | "pending" | "done" | "dismissed">(() => (confirmedList().includes(fingerprint) ? "done" : "idle"));
  const [error, setError] = useState<string | null>(null);

  const view = (() => {
    switch (action.type) {
      case "create_task":
        return { icon: CheckSquare, label: "New task", title: action.title, detail: `${action.dueDate ? `Due ${action.dueDate}` : "No due date"} · ${action.priority}` };
      case "create_note":
        return { icon: FileText, label: "New note", title: action.title, detail: action.content.slice(0, 120) };
      case "log_transaction":
        return { icon: Wallet, label: action.kind === "income" ? "Record income" : "Record expense", title: action.description, detail: money(action.amount) };
      case "create_event":
        return {
          icon: Calendar,
          label: "New event",
          title: action.title,
          detail: `${new Date(action.start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}${action.location ? ` · ${action.location}` : ""}`,
        };
    }
  })();

  function confirm() {
    setState("pending");
    setError(null);
    const outcome = {
      onSuccess: () => {
        remember(fingerprint);
        setState("done");
      },
      onError: (err: Error) => {
        setError(err.message);
        setState("idle");
      },
    };

    if (action.type === "create_task") {
      createTask.mutate(
        { title: action.title, priority: action.priority, status: "todo", ...(action.dueDate ? { dueDate: new Date(`${action.dueDate}T12:00:00`).toISOString() } : {}) },
        outcome
      );
    } else if (action.type === "create_note") {
      createNote.mutate({ title: action.title, content: action.content, folder: "Personal" }, outcome);
    } else if (action.type === "log_transaction") {
      createTransaction.mutate({ type: action.kind === "income" ? "INCOME" : "EXPENSE", amount: action.amount, description: action.description }, outcome);
    } else {
      createEvent.mutate(
        { title: action.title, type: "OTHER", allDay: false, location: action.location, start: new Date(action.start).toISOString(), end: new Date(action.end).toISOString() },
        outcome
      );
    }
  }

  if (state === "dismissed") return null;
  const Icon = view.icon;

  return (
    <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{view.label}</p>
          <p className="truncate text-sm font-medium">{view.title}</p>
          {view.detail && <p className="truncate text-xs text-muted-foreground">{view.detail}</p>}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        {state === "done" ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"><Check className="h-3.5 w-3.5" /> Added</span>
        ) : (
          <>
            <Button size="sm" className="h-8" disabled={state === "pending"} onClick={confirm}>{state === "pending" ? "Saving..." : "Confirm"}</Button>
            <Button size="sm" variant="ghost" className="h-8" disabled={state === "pending"} onClick={() => setState("dismissed")}>Dismiss</Button>
          </>
        )}
      </div>
    </div>
  );
}

function promptsFor(context?: AssistantContext) {
  const out: string[] = [];
  if (context?.tasks.overdue.length) out.push("Help me clear my overdue tasks");
  out.push("What should I focus on today?");
  if (context && context.finance.monthlyBudget > 0) out.push("How am I doing on my budget?");
  if (context?.habits.atRisk) out.push("Which of my habits are at risk?");
  out.push("Plan my day around my calendar");
  return out.slice(0, 4);
}

export function AIAssistantContent() {
  const { data: context } = useAIContext();
  const { data: conversations = [] } = useAssistantConversations();
  const removeConversation = useDeleteConversation();
  const { send, stop, isStreaming, error, clearError } = useAssistantChat();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function handleSend(text: string) {
    const prompt = text.trim();
    if (!prompt || isStreaming) return;
    const stamp = Date.now();
    const userId = `u-${stamp}`;
    const replyId = `a-${stamp}`;

    setMessages((previous) => [...previous, { id: userId, role: "user", content: prompt }, { id: replyId, role: "assistant", content: "" }]);
    setInput("");

    const result = await send(prompt, activeId, (chunk) =>
      setMessages((previous) => previous.map((message) => (message.id === replyId ? { ...message, content: message.content + chunk } : message)))
    );

    if (result.conversationId) setActiveId(result.conversationId);
    if (!result.ok) {
      setMessages((previous) => previous.filter((message) => message.id !== replyId || message.content));
      setMessages((previous) => (previous[previous.length - 1]?.id === userId ? previous.slice(0, -1) : previous));
      setInput(prompt);
    }
  }

  async function openConversation(id: string) {
    if (isStreaming) return;
    setHistoryOpen(false);
    clearError();
    try {
      const data = await api.get(`/ai-assistant/conversations/${id}`);
      setMessages((data.conversation.messages as StoredMessage[]).map((message) => ({ id: message.id, role: message.role, content: message.content })));
      setActiveId(id);
    } catch {}
  }

  function startNew() {
    if (isStreaming) return;
    setMessages([]);
    setActiveId(null);
    setHistoryOpen(false);
    clearError();
  }

  function copy(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  const stats = context
    ? [
        { label: "Due today", value: context.tasks.today.length },
        { label: "Overdue", value: context.tasks.overdue.length, warn: context.tasks.overdue.length > 0 },
        { label: "Events today", value: context.events.today.length },
        { label: "Habits done", value: `${context.habits.doneToday}/${context.habits.total}` },
      ]
    : [];

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border">
      <aside className={cn("flex-col border-r bg-background lg:static lg:flex lg:w-72 lg:shrink-0", historyOpen ? "fixed inset-0 z-40 flex" : "hidden")}>
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <Button size="sm" className="flex-1" onClick={startNew}><Plus className="mr-1.5 h-4 w-4" /> New chat</Button>
          <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Close history" onClick={() => setHistoryOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Your conversations will appear here.</p>
          ) : (
            conversations.map((conversation) => (
              <div key={conversation.id} className={cn("group flex items-center gap-1 border-b pr-2 hover:bg-muted/50", activeId === conversation.id && "bg-muted")}>
                <button type="button" onClick={() => openConversation(conversation.id)} className="min-w-0 flex-1 px-3 py-3 text-left">
                  <span className="block truncate text-sm font-medium">{conversation.title}</span>
                  <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}</span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100"
                  aria-label="Delete conversation"
                  onClick={() => {
                    if (!window.confirm("Delete this conversation?")) return;
                    removeConversation.mutate(conversation.id);
                    if (activeId === conversation.id) startNew();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-3 py-2.5">
          <Button size="icon" variant="ghost" className="lg:hidden" aria-label="History" onClick={() => setHistoryOpen(true)}><History className="h-4 w-4" /></Button>
          <Sparkles className="h-4 w-4 text-primary" />
          <h1 className="text-base font-semibold">AI Assistant</h1>
          <Button size="sm" variant="ghost" className="ml-auto lg:hidden" onClick={startNew}><Plus className="mr-1 h-4 w-4" /> New</Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-lg flex-col items-center py-8 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg"><Sparkles className="h-7 w-7 text-white" /></span>
              <h2 className="text-lg font-semibold">{context ? `Hi ${context.user.name.split(" ")[0]}, how can I help?` : "How can I help?"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">I know your tasks, calendar, habits and spending. Ask me anything, or tell me to add something.</p>
              {context ? (
                <div className="mt-5 grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-lg border p-2.5">
                      <p className={cn("text-lg font-semibold tabular-nums", stat.warn && "text-amber-500")}>{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <Skeleton className="mt-5 h-16 w-full" />
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {promptsFor(context).map((prompt) => (
                  <Button key={prompt} variant="outline" size="sm" onClick={() => handleSend(prompt)}>{prompt}</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setInput("Add a task to ")}>Add a task...</Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.map((message) => {
                if (message.role === "user") {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{message.content}</p>
                    </div>
                  );
                }
                const parts = splitMessage(message.content);
                const streamingThis = isStreaming && message.id === messages[messages.length - 1].id;
                return (
                  <div key={message.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      {parts.text ? (
                        <article className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{parts.text}</ReactMarkdown>
                        </article>
                      ) : streamingThis ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...</p>
                      ) : null}
                      {parts.action && <ActionCard action={parts.action} fingerprint={parts.key} />}
                      {!streamingThis && parts.text && (
                        <button type="button" onClick={() => copy(message.id, parts.text)} className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                          {copied === message.id ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t p-3">
          {error && (
            <p className="mx-auto mb-2 max-w-2xl rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error} Your message is back in the box so you can resend it.</p>
          )}
          <form
            className="mx-auto flex max-w-2xl items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend(input);
            }}
          >
            <Textarea
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend(input);
                }
              }}
              placeholder="Ask about your day, or say what to add..."
              maxLength={2000}
              className="min-h-[2.5rem] resize-none"
            />
            {isStreaming ? (
              <Button type="button" variant="outline" size="icon" aria-label="Stop" onClick={stop}><Square className="h-4 w-4" /></Button>
            ) : (
              <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}><Send className="h-4 w-4" /></Button>
            )}
          </form>
          <p className="mx-auto mt-2 flex max-w-2xl items-center gap-1.5 text-[11px] text-muted-foreground">
            <MessageSquare className="h-3 w-3" /> AI can make mistakes. Check important details. A summary of your tasks, calendar and spending is shared with the AI to answer.
          </p>
        </div>
      </section>
    </div>
  );
}