"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Tone = "default" | "success" | "warning" | "danger";

const TONES: Record<Tone, { icon: string; bar: string; value: string }> = {
  default: { icon: "bg-primary/10 text-primary", bar: "bg-primary", value: "" },
  success: { icon: "bg-emerald-500/10 text-emerald-500", bar: "bg-emerald-500", value: "" },
  warning: { icon: "bg-amber-500/10 text-amber-500", bar: "bg-amber-500", value: "text-amber-500" },
  danger: { icon: "bg-destructive/10 text-destructive", bar: "bg-destructive", value: "text-destructive" },
};

export function PageHeader({ icon: Icon, title, subtitle, actions }: { icon: LucideIcon; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone = "default", className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all", TONES[tone].bar)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  progress,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  progress?: number;
  href?: string;
}) {
  const card = (
    <Card className={cn("h-full transition-colors", href && "hover:border-primary/40")}>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONES[tone].icon)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className={cn("text-2xl font-semibold tabular-nums tracking-tight", TONES[tone].value)}>{value}</p>
        {progress !== undefined && <ProgressBar value={progress} tone={tone} />}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="block h-full">{card}</Link> : card;
}

export function Section({ title, icon: Icon, action, children, className }: { title: string; icon?: LucideIcon; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            {title}
          </h2>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function SectionLink({ href, children = "Open" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
      {children} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="max-w-xs text-xs text-muted-foreground">{body}</p>}
      {action}
    </div>
  );
}

export function ModuleTile({ href, icon: Icon, title, metric, caption }: { href: string; icon: LucideIcon; title: string; metric: React.ReactNode; caption?: React.ReactNode }) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full transition-colors group-hover:border-primary/40">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-semibold tabular-nums">{metric}</p>
          </div>
          {caption && <p className="truncate text-xs text-muted-foreground">{caption}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}