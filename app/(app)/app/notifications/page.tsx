// 

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bell, BellOff, Briefcase, CheckCheck, CreditCard, Info, Settings, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader } from "@/components/app/kit";
import { useDeleteNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}

const LOOK: Record<string, { icon: LucideIcon; tint: string }> = {
  INFO: { icon: Info, tint: "bg-sky-500/10 text-sky-500" },
  SUCCESS: { icon: Info, tint: "bg-emerald-500/10 text-emerald-500" },
  WARNING: { icon: AlertTriangle, tint: "bg-amber-500/10 text-amber-500" },
  ALERT: { icon: AlertTriangle, tint: "bg-destructive/10 text-destructive" },
  BILLING: { icon: CreditCard, tint: "bg-violet-500/10 text-violet-500" },
  MERCHANT: { icon: Briefcase, tint: "bg-primary/10 text-primary" },
  STAFF: { icon: Briefcase, tint: "bg-orange-500/10 text-orange-500" },
  SYSTEM: { icon: Bell, tint: "bg-muted text-muted-foreground" },
};

const FILTERS: { key: string; label: string; match: (row: Row) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "unread", label: "Unread", match: (row) => !row.read },
  { key: "alerts", label: "Alerts", match: (row) => row.type === "WARNING" || row.type === "ALERT" },
  { key: "billing", label: "Billing", match: (row) => row.type === "BILLING" },
  { key: "business", label: "Business", match: (row) => row.type === "MERCHANT" || row.type === "STAFF" },
];

function dayGroup(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier";
}

const internal = (url: string | null) => (url && url.startsWith("/") && !url.startsWith("//") ? url : null);

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => (Array.isArray(data) ? (data as Row[]) : []), [data]);
  const active = FILTERS.find((item) => item.key === filter) ?? FILTERS[0];
  const visible = useMemo(() => rows.filter(active.match), [rows, active]);
  const unread = rows.filter((row) => !row.read).length;

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    visible.forEach((row) => map.set(dayGroup(row.createdAt), [...(map.get(dayGroup(row.createdAt)) ?? []), row]));
    return ["Today", "Yesterday", "Earlier"].filter((name) => map.has(name)).map((name) => ({ name, rows: map.get(name)! }));
  }, [visible]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up."}
        actions={
          <>
            <Button variant="outline" asChild><Link href="/app/settings"><Settings className="mr-1.5 h-4 w-4" /> Preferences</Link></Button>
            <Button variant="outline" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read</Button>
          </>
        }
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((item) => {
          const count = rows.filter(item.match).length;
          return (
            <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", filter === item.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
              {item.label} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState icon={BellOff} title={rows.length === 0 ? "Nothing here yet" : "Nothing matches"} body={rows.length === 0 ? "Reminders, alerts and updates will show up here. You choose which in Settings." : "Try another filter."} />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.name} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.name}</h2>
              {group.rows.map((row) => {
                const look = LOOK[row.type] ?? LOOK.SYSTEM;
                const Icon = look.icon;
                const href = internal(row.actionUrl);
                const body = (
                  <>
                    <p className={cn("text-sm", !row.read && "font-semibold")}>{row.title}</p>
                    <p className="text-sm text-muted-foreground">{row.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}</p>
                  </>
                );
                return (
                  <div key={row.id} className={cn("flex items-start gap-3 rounded-xl border bg-card p-4", !row.read && "border-primary/30 bg-primary/5")}>
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", look.tint)}><Icon className="h-4 w-4" /></span>
                    {href ? (
                      <Link href={href} className="min-w-0 flex-1" onClick={() => !row.read && markRead.mutate(row.id)}>{body}</Link>
                    ) : (
                      <div className="min-w-0 flex-1">{body}</div>
                    )}
                    <div className="flex shrink-0 gap-0.5">
                      {!row.read && <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Mark as read" onClick={() => markRead.mutate(row.id)}><CheckCheck className="h-4 w-4" /></Button>}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Delete" onClick={() => remove.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
          <p className="text-center text-xs text-muted-foreground">Showing your latest 50 notifications.</p>
        </div>
      )}
    </div>
  );
}