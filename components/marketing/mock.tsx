import type { ReactNode } from "react";
import { Check, CloudOff, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function MockWindow({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-primary/10", className)} aria-hidden="true">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">{title}</span>
        <span className="rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">Sample</span>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

const TONES = { primary: "bg-primary", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-destructive" };

export function MockBar({ value, tone = "primary" }: { value: number; tone?: keyof typeof TONES }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", TONES[tone])} style={{ width: `${value}%` }} />
    </div>
  );
}

export function MockStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function MockChart({ values, highlight }: { values: number[]; highlight?: number }) {
  return (
    <div className="flex h-20 items-end gap-1">
      {values.map((value, index) => (
        <div key={index} className={cn("flex-1 rounded-t", index === highlight ? "bg-primary" : "bg-primary/30")} style={{ height: `${value}%` }} />
      ))}
    </div>
  );
}

export function HeroPreview() {
  const timeline = [
    ["9:00 AM", "Review quarterly report", true],
    ["10:30 AM", "Team stand-up", false],
    ["1:00 PM", "Call the landlord", false],
  ] as const;

  return (
    <MockWindow title="Today · Thursday">
      <div className="grid grid-cols-3 gap-2">
        <MockStat label="Tasks" value="3 of 7" />
        <MockStat label="Spent" value="₦265,300" />
        <MockStat label="Habit streak" value="12 days" />
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-primary"><Sparkles className="h-3 w-3" /> Your daily brief</p>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li>• Your report is due first. Do it before the 10:30 stand-up.</li>
          <li>• Two habits are still open. Your 12-day walking streak is at risk.</li>
          <li>• You're at 88% of this month's food budget.</li>
        </ul>
      </div>

      <div className="space-y-1.5">
        {timeline.map(([time, title, done]) => (
          <div key={title} className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <span className="w-14 shrink-0 text-[10px] tabular-nums text-muted-foreground">{time}</span>
            <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", done && "border-primary bg-primary text-primary-foreground")}>{done && <Check className="h-3 w-3" />}</span>
            <span className={cn("text-xs", done && "text-muted-foreground line-through")}>{title}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Flame className="h-3.5 w-3.5 text-orange-500" /> Morning walk · 12-day streak</div>
    </MockWindow>
  );
}

export function PosPreview() {
  const lines = [["Indomie (carton)", "2", "₦11,000"], ["Peak milk 400g", "3", "₦6,300"], ["Bottled water x12", "1", "₦2,400"]];

  return (
    <MockWindow title="New sale · Ikeja branch">
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
        <CloudOff className="h-3.5 w-3.5 shrink-0" /> You're offline. Sales are saved and upload when you reconnect. 3 waiting.
      </div>
      <div className="space-y-1.5">
        {lines.map(([name, quantity, price]) => (
          <div key={name} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
            <span>{name} <span className="text-muted-foreground">× {quantity}</span></span>
            <span className="tabular-nums">{price}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-xs text-muted-foreground">Total · Cash</span>
        <span className="text-lg font-bold tabular-nums">₦19,700</span>
      </div>
      <div className="rounded-lg bg-primary py-2 text-center text-xs font-semibold text-primary-foreground">Complete sale</div>
    </MockWindow>
  );
}