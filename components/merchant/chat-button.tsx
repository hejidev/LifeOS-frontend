"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useChatUnread } from "@/lib/hooks/use-chat";

export function ChatButton() {
  const { data: unread = 0 } = useChatUnread();

  return (
    <Link
      href="/merchant/chat"
      aria-label="Team chat"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
    >
      <MessageSquare className="h-4 w-4" />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}