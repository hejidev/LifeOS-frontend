"use client";

import Link from "next/link";
import { AlertTriangle, CloudOff, CloudUpload, LogIn } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAgo } from "@/lib/offline/utils";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  failedCount: number;
  foreignCount: number;
  sessionExpired: boolean;
  catalogSavedAt: number | null;
  onOpenQueue?: () => void;
  onSyncNow?: () => void;
  className?: string;
}

const TONES = {
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  danger: "border-red-500/30 bg-red-500/10 text-red-600",
  info: "border-primary/30 bg-primary/10 text-primary",
};

function plural(count: number) {
  return `${count} sale${count === 1 ? "" : "s"}`;
}

export function OfflineBanner({
  online,
  syncing,
  pendingCount,
  failedCount,
  foreignCount,
  sessionExpired,
  catalogSavedAt,
  onOpenQueue,
  onSyncNow,
  className,
}: OfflineBannerProps) {
  let tone: keyof typeof TONES | null = null;
  let Icon: LucideIcon = CloudOff;
  let message = "";
  let detail: string | null = null;

  if (sessionExpired) {
    tone = "danger";
    Icon = LogIn;
    message =
      pendingCount > 0
        ? `Your session expired. ${plural(pendingCount)} will upload after you sign in again.`
        : "Your session expired. Sign in again to keep working.";
  } else if (failedCount > 0) {
    tone = "danger";
    Icon = AlertTriangle;
    message = `${plural(failedCount)} couldn't upload and need attention`;
  } else if (!online) {
    tone = "warning";
    message =
      pendingCount > 0
        ? `Offline · ${plural(pendingCount)} saved on this PC`
        : "You're offline. Sales are saved on this PC and upload automatically.";
    detail = catalogSavedAt ? `Prices and stock as of ${formatAgo(catalogSavedAt)}` : null;
  } else if (syncing) {
    tone = "info";
    Icon = CloudUpload;
    message = `Uploading ${plural(Math.max(1, pendingCount))}…`;
  } else if (pendingCount > 0) {
    tone = "info";
    Icon = CloudUpload;
    message = `${plural(pendingCount)} waiting to upload`;
  } else if (foreignCount > 0) {
    tone = "info";
    Icon = CloudUpload;
    message = `${plural(foreignCount)} from another store will upload when that store signs in`;
  }

  if (!tone) return null;

  const showSync = online && pendingCount > 0 && !syncing && !sessionExpired;
  const showQueue = pendingCount + failedCount > 0 && onOpenQueue;

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border px-3.5 py-2.5", TONES[tone], className)}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{message}</p>
        {detail ? <p className="text-[11px] text-muted-foreground">{detail}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {sessionExpired ? (
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <Link href="/staff/login">Sign in</Link>
          </Button>
        ) : null}
        {showSync ? (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSyncNow}>
            Sync now
          </Button>
        ) : null}
        {showQueue ? (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onOpenQueue}>
            View
          </Button>
        ) : null}
      </div>
    </div>
  );
}