"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useNotifications, useUnreadCount, useMarkNotificationRead,
  useMarkAllNotificationsRead, useDeleteNotification, useLiveNotifications,
} from "@/lib/hooks/use-notifications";

const TYPE_COLORS: Record<string, string> = {
  INFO: "bg-sky-500", SUCCESS: "bg-emerald-500", WARNING: "bg-amber-500",
  ALERT: "bg-destructive", BILLING: "bg-violet-500", MERCHANT: "bg-primary",
  STAFF: "bg-orange-500", SYSTEM: "bg-muted-foreground",
};

export function NotificationBell({ viewAllHref = "/app/notifications" }: { viewAllHref?: string }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  useLiveNotifications((n) => {
    setToast(n);
    setTimeout(() => setToast(null), 4000);
  });

  return (
    <div className="relative">
      <Button onClick={() => setOpen((o) => !o)} className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 z-50 w-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">You're all caught up.</p>
                ) : (
                  (notifications as any[]).map((n) => (
                    <div key={n.id} className={cn("flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors group", !n.read && "bg-primary/5")}>
                      <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", TYPE_COLORS[n.type] ?? "bg-muted-foreground")} />
                      <Link href={n.actionUrl ?? "#"} onClick={() => setOpen(false)} className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                      </Link>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!n.read && <button onClick={() => markRead.mutate(n.id)} className="text-muted-foreground hover:text-primary"><Check className="h-3.5 w-3.5" /></button>}
                        <button onClick={() => deleteNotif.mutate(n.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-border">
              <Link href={viewAllHref} onClick={() => setOpen(false)} className="text-xs text-primary hover:underline">View all notifications</Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-4 left-1/2 z-[60] w-full max-w-sm rounded-xl border border-border bg-card shadow-xl px-4 py-3 flex items-start gap-3"
          >
            <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", TYPE_COLORS[toast.type] ?? "bg-muted-foreground")} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{toast.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}