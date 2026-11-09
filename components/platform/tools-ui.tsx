"use client";

import { cn } from "@/lib/utils";

export const AREA_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  merchant: "Merchant",
  staff: "Staff terminal",
  user: "User dashboard",
  public: "Public and sign-in",
  loadtest: "Load test",
};

export const AREA_COLORS: Record<string, string> = {
  super_admin: "bg-violet-500",
  admin: "bg-sky-500",
  merchant: "bg-emerald-500",
  staff: "bg-amber-500",
  user: "bg-primary",
  public: "bg-muted-foreground/60",
  loadtest: "bg-pink-500",
};

export const AREA_KEYS = ["super_admin", "admin", "merchant", "staff", "user", "public", "loadtest"];

export const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`);
export const rate = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 2 : 1)}%` : "0%");

export function StackedBars({ columns, keys, height = 128 }: { columns: { label: string; values: Record<string, number> }[]; keys: string[]; height?: number }) {
  const max = Math.max(1, ...columns.map((column) => keys.reduce((sum, key) => sum + (column.values[key] ?? 0), 0)));
  return (
    <div>
      <div className="flex items-end gap-px" style={{ height }}>
        {columns.map((column, index) => (
          <div
            key={index}
            className="flex h-full flex-1 flex-col-reverse"
            title={`${column.label}: ${keys.reduce((sum, key) => sum + (column.values[key] ?? 0), 0)} requests`}
          >
            {keys.map((key) => {
              const value = column.values[key] ?? 0;
              return value > 0 ? <div key={key} className={AREA_COLORS[key]} style={{ height: `${(value / max) * 100}%` }} /> : null;
            })}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{columns[0]?.label}</span>
        <span>{columns[columns.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function MiniBars({ values, tone = "bg-primary", height = 56, title }: { values: number[]; tone?: string; height?: number; title: string }) {
  const max = Math.max(1, ...values);
  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">{title}</p>
      <div className="flex items-end gap-px" style={{ height }}>
        {values.map((value, index) => (
          <div key={index} className="flex h-full flex-1 items-end">
            <div className={cn("w-full rounded-t-sm", tone)} style={{ height: `${Math.max(2, (value / max) * 100)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShareBars({ rows }: { rows: { instance: string; requests: number; share: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.instance} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-mono text-xs">{row.instance}</span>
            <span className="text-xs text-muted-foreground">
              {row.requests.toLocaleString()} requests · {row.share}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(2, row.share)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}