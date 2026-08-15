"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Trash2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from "@/lib/hooks/use-notifications";

const TYPE_COLORS: Record<string, string> = {
  INFO: "bg-sky-500", SUCCESS: "bg-emerald-500", WARNING: "bg-amber-500",
  ALERT: "bg-destructive", BILLING: "bg-violet-500", MERCHANT: "bg-primary",
  STAFF: "bg-orange-500", SYSTEM: "bg-muted-foreground",
};

function groupByDate(items: any[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, any[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const n of items) {
    const d = new Date(n.createdAt).toDateString();
    if (d === today) groups.Today.push(n);
    else if (d === yesterday) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  }
  return groups;
}

export function NotificationsList() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = filter === "unread" ? (notifications as any[]).filter((n) => !n.read) : notifications;
  const grouped = groupByDate(filtered);
  const unreadCount = (notifications as any[]).filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()}><CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read</Button>}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="unread">Unread</TabsTrigger></TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Nothing here.</p>
      ) : (
        Object.entries(grouped).map(([label, items]) =>
          items.length === 0 ? null : (
            <div key={label} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              {items.map((n) => (
                <Card key={n.id} className={cn("hover:border-primary/20 transition-colors", !n.read && "border-primary/30 bg-primary/5")}>
                  <CardContent className="py-3 flex items-start gap-3">
                    <div className={cn("h-2 w-2 rounded-full mt-2 shrink-0", TYPE_COLORS[n.type] ?? "bg-muted-foreground")} />
                    <Link href={n.actionUrl ?? "#"} className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </Link>
                    <div className="flex gap-1 shrink-0">
                      {!n.read && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => markRead.mutate(n.id)}><Check className="h-3.5 w-3.5" /></Button>}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteNotif.mutate(n.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )
      )}
    </div>
  );
}