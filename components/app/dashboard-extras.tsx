"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, RefreshCw, Rocket, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar, Section } from "@/components/app/kit";
import { useDailyBrief, useGenerateBrief, useSetupStatus } from "@/lib/hooks/use-discover";

const DISMISS_KEY = "lifeos:setup:dismissed";

export function SetupChecklist() {
  const { data } = useSetupStatus();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!data || dismissed || data.completed >= data.total) return null;

  const remaining = data.steps.filter((step) => !step.done).slice(0, 4);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Get set up</h2>
          <span className="text-xs text-muted-foreground">{data.completed} of {data.total} done</span>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {}
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ProgressBar className="mt-3" value={(data.completed / data.total) * 100} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {remaining.map((step) => (
          <Link key={step.key} href={step.href} className="group flex items-center gap-3 rounded-lg border bg-background/70 px-3 py-2.5 transition-colors hover:border-primary/40">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground"><Check className="h-3 w-3 opacity-0" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{step.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{step.hint}</span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DailyBriefCard() {
  const { data, isLoading } = useDailyBrief();
  const generate = useGenerateBrief();

  const lines = useMemo(
    () => (data?.brief ?? "").split("\n").map((line) => line.replace(/^[\s•\-*]+/, "").trim()).filter(Boolean),
    [data?.brief]
  );

  const action = (
    <Button size="sm" variant={lines.length ? "ghost" : "default"} disabled={generate.isPending} onClick={() => generate.mutate()}>
      {generate.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : lines.length ? <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
      {generate.isPending ? "Writing..." : lines.length ? "Refresh" : "Generate my brief"}
    </Button>
  );

  return (
    <Section title="Your daily brief" icon={Sparkles} action={action} className="border-primary/20">
      {isLoading ? (
        <div className="space-y-2"><div className="h-3 w-3/4 animate-pulse rounded bg-muted" /><div className="h-3 w-2/3 animate-pulse rounded bg-muted" /></div>
      ) : lines.length > 0 ? (
        <>
          <ul className="space-y-1.5 text-sm">
            {lines.map((line, index) => (
              <li key={index} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" /> <span>{line}</span></li>
            ))}
          </ul>
          {data?.generatedAt && <p className="text-[11px] text-muted-foreground">Written {new Date(data.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Uses a summary of your tasks, calendar, habits and spending.</p>}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">One tap gives you a short plan for today, built from your tasks, calendar, habits and spending.</p>
      )}
      {generate.isError && <p className="text-xs text-destructive">{(generate.error as Error).message}</p>}
    </Section>
  );
}