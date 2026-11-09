"use client";

import type { ComponentType, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const money = (currency: string, value: unknown) =>
  `${currency} ${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const when = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

const PAYMENTS: Record<string, string> = { CASH: "Cash", CARD: "Card", TRANSFER: "Transfer", MOBILE_MONEY: "Mobile money" };
export const paymentLabel = (method: string) => PAYMENTS[method] ?? method.replace(/_/g, " ").toLowerCase();
export const METHODS = ["CASH", "CARD", "TRANSFER", "MOBILE_MONEY"] as const;

export function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

export function daysAgo(iso: string | null | undefined) {
  if (!iso) return "never";
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) / 86400000
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? "" : "s"} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? "" : "s"} ago`;
}

type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/15 text-primary",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "bg-destructive/15 text-destructive",
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", TONES[tone])}>{children}</span>;
}

export function PageHeader({ icon: Icon, title, subtitle, actions }: { icon: ComponentType<{ className?: string }>; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg border border-primary/20 bg-linear-to-br from-primary/20 to-primary/5 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle ? <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "success" | "danger" }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("truncate text-xl font-bold", tone === "success" && "text-emerald-600 dark:text-emerald-400", tone === "danger" && "text-destructive")}>{value}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function HourBars({ hourly }: { hourly: { hour: number; total: number; count: number }[] }) {
  const peak = hourly.reduce((best, row) => (row.total > best.total ? row : best), hourly[0]);
  return (
    <div>
      <div className="flex h-28 items-end gap-0.5">
        {hourly.map((row) => (
          <div key={row.hour} className="flex h-full flex-1 items-end" title={`${row.hour}:00 · ${row.count} sale${row.count === 1 ? "" : "s"}`}>
            <div
              className={cn("w-full rounded-t-sm", row.hour === peak.hour && peak.total > 0 ? "bg-primary" : "bg-primary/30")}
              style={{ height: `${peak.total > 0 ? Math.max(2, (row.total / peak.total) * 100) : 2}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
      </div>
    </div>
  );
}

const MIX: Record<string, string> = { CASH: "bg-emerald-500", CARD: "bg-primary", TRANSFER: "bg-sky-500", MOBILE_MONEY: "bg-orange-400" };

export function MixBar({ rows, currency }: { rows: { method: string; count: number; total: number }[]; currency: string }) {
  const sum = rows.reduce((total, row) => total + row.total, 0);
  if (rows.length === 0) return <Empty>No payments yet.</Empty>;
  return (
    <div className="space-y-3">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {rows.map((row) => (
          <div key={row.method} className={cn("h-full", MIX[row.method] ?? "bg-muted-foreground")} style={{ flex: Math.max(row.total, 1) }} />
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.method} className="flex items-center gap-2 text-sm">
          <span className={cn("h-2.5 w-2.5 rounded-full", MIX[row.method] ?? "bg-muted-foreground")} />
          <span className="flex-1">{paymentLabel(row.method)}</span>
          <span className="text-xs text-muted-foreground">{row.count} · {sum > 0 ? Math.round((row.total / sum) * 100) : 0}%</span>
          <span className="font-medium">{money(currency, row.total)}</span>
        </div>
      ))}
    </div>
  );
}