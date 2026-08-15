"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, Loader2, CheckSquare, Wallet, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIContext, useAIAssistantChat } from "@/lib/hooks/use-life-data";
import { formatCurrency } from "@/lib/utils";

const suggestedPrompts = [
  "What should I focus on today?",
  "Am I over budget?",
  "Summarize my week",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function AIAssistantContent() {
  const { data: context, isLoading } = useAIContext();
  const { sendMessage, isStreaming, error } = useAIAssistantChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  async function handleSend(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: "user", content: text };
    const assistantId = `msg-${Date.now()}-ai`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");

    await sendMessage(text, (chunk) => {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)));
    });
  }

  if (isLoading || !context) {
    return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;
  }

  const c = context as any;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="flex-1 flex flex-col rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground">Context-aware — I can see your tasks, notes, and finances</p>
        </div>

        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">How can I help you today?</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                I can see your tasks, budget, and notes to give personalized advice.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedPrompts.map((prompt) => (
                  <Button key={prompt} variant="outline" size="sm" onClick={() => handleSend(prompt)}>
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${msg.role === "user" ? "gradient-bg text-white" : "bg-card border border-border"}`}>
                    <div className="whitespace-pre-wrap">
                      {msg.content}
                      {msg.role === "assistant" && isStreaming && msg.id === messages[messages.length - 1].id && (
                        <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse align-middle" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about your day..." disabled={isStreaming} />
            <Button type="submit" disabled={isStreaming || !input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
          {error && <p className="text-xs text-destructive mt-2 text-center">{error}</p>}
        </div>
      </div>

      <div className="w-80 shrink-0 space-y-4 hidden xl:block">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Context Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-2"><CheckSquare className="h-3 w-3" /> Tasks</div>
              <div className="pl-5 space-y-1">
                <p className="text-xs">{c.todayTasks.length} due today</p>
                <p className="text-xs text-destructive">{c.overdueTasks.length} overdue</p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-2"><Wallet className="h-3 w-3" /> Budget</div>
              <p className="text-xs pl-5">{formatCurrency(c.finance.totalSpent)} / {formatCurrency(c.finance.monthlyBudget)}</p>
              {c.finance.insight && <Badge variant="secondary" className="text-[10px] mt-1 ml-5">{c.finance.insight}</Badge>}
            </div>

            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-2"><FileText className="h-3 w-3" /> Recent Notes</div>
              {c.recentNotes.length === 0 ? (
                <p className="text-xs pl-5 text-muted-foreground">No notes yet</p>
              ) : (
                c.recentNotes.map((n: any) => <p key={n.id} className="text-xs pl-5 mb-1 truncate">{n.title}</p>)
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}