"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { useBizProducts, useBizProfile, useBizSales } from "@/lib/hooks/use-life-data";
import { useChatMessages, useChatThreads, useMarkChatRead, useSendChatMessage } from "@/lib/hooks/use-chat";

export default function MerchantChatPage() {
  const { data: threads = [] } = useChatThreads();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: messages = [], isLoading } = useChatMessages(activeId);
  const send = useSendChatMessage();
  const { mutate: markRead } = useMarkChatRead();
  const lastId = messages[messages.length - 1]?.id;

  const { data: products = [] } = useBizProducts();
  const { data: sales = [] } = useBizSales("week");
  const { data: profile } = useBizProfile();
  const currency: string = profile?.currency ?? "NGN";

  const pickers = useMemo(
    () => ({
      products: products.map((product) => ({
        id: product.id,
        title: product.name,
        subtitle: `${currency} ${Number(product.price).toLocaleString()} · ${product.stock} in stock`,
      })),
      sales: [...sales]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 80)
        .map((sale) => ({
          id: sale.id,
          title: sale.receiptNumber,
          subtitle: `${currency} ${Number(sale.total).toLocaleString()} · ${new Date(sale.createdAt).toLocaleString()}`,
        })),
    }),
    [products, sales, currency]
  );

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("thread");
    if (requested) setActiveId(requested);
  }, []);

  useEffect(() => {
    if (!activeId && threads.length > 0 && window.matchMedia("(min-width: 768px)").matches) {
      setActiveId(threads[0].id);
    }
  }, [threads, activeId]);

  useEffect(() => {
    if (activeId && lastId) markRead(activeId);
  }, [activeId, lastId, markRead]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg border border-primary/20 bg-linear-to-br from-primary/20 to-primary/5 p-2">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Team chat</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Talk to your team about products, sales and shifts</p>
        </div>
      </div>

      <ChatWorkspace
        className="h-[calc(100vh-14rem)] min-h-96"
        threads={threads}
        activeId={activeId}
        onSelect={setActiveId}
        messages={messages}
        loading={isLoading}
        isMine={(message) => message.senderType === "OWNER"}
        pickers={pickers}
        onSend={async (body, attachment) => {
          if (activeId) await send.mutateAsync({ threadId: activeId, body, attachment });
        }}
      />
    </div>
  );
}