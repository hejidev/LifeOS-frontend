"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, BookOpen, Calendar, CheckSquare, FileText, HeartPulse, KeyRound, Plus,
  ShieldCheck, Sparkles, Target, TrendingUp, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ModuleTile, ProgressBar, Section, SectionLink, StatCard, type Tone } from "@/components/app/kit";
import { useCreateNote, useCreateTask, useTodayOverview, useUpdateTaskStatus, useUserProfile } from "@/lib/hooks/use-life-data";
import { formatCurrency, dueNoon } from "@/lib/utils";
import { BecomeMerchantCard } from "../merchant/become-merchant-card";

import { DailyBriefCard, SetupChecklist } from "@/components/app/dashboard-extras";

type Overview = {
  user: { name: string };
  events: { id: string; title: string; start: string; type: string }[];
  priorityTasks: { id: string; title: string; status: "todo" | "in_progress" | "done"; priority: "P1" | "P2" | "P3" | "P4"; dueTime?: string }[];
  overdueCount: number;
  goals: { id: string; title: string; progress: number; target: number; unit?: string }[];
  finance: { totalSpent: number; monthlyBudget: number; totalIncome: number };
  recentNotes: { id: string; title: string; summary: string }[];
  documents: { total: number; encrypted: number; expiringSoon: number };
  study: { total: number; inProgress: number; completed: number; nextMaterialTitle?: string };
  health: { sleepHours: number; steps: number };
  passwordVault: { totalItems: number; weakCount: number };
  family: { members: unknown[] };
  suggestions: { id: string; title: string; reason: string }[];
};

type TimelineItem = {
  key: string;
  kind: "event" | "task";
  id: string;
  title: string;
  minutes: number | null;
  label: string;
  status?: "todo" | "in_progress" | "done";
  priority?: string;
  type?: string;
};

const PRIORITY_RANK: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

function buildTimeline(data: Overview): TimelineItem[] {
  const events: TimelineItem[] = data.events.map((event) => {
    const start = new Date(event.start);
    return {
      key: `e-${event.id}`,
      kind: "event",
      id: event.id,
      title: event.title,
      minutes: start.getHours() * 60 + start.getMinutes(),
      label: format(start, "h:mm a"),
      type: event.type,
    };
  });

  const tasks: TimelineItem[] = data.priorityTasks.map((task) => {
    const [hours, minutes] = (task.dueTime ?? "").split(":").map(Number);
    const timed = Number.isFinite(hours) && Number.isFinite(minutes);
    return {
      key: `t-${task.id}`,
      kind: "task",
      id: task.id,
      title: task.title,
      minutes: timed ? hours * 60 + minutes : null,
      label: timed ? format(new Date(2000, 0, 1, hours, minutes), "h:mm a") : "Anytime",
      status: task.status,
      priority: task.priority,
    };
  });

  return [...events, ...tasks].sort((a, b) => {
    if (a.minutes !== null && b.minutes !== null) return a.minutes - b.minutes;
    if (a.minutes !== null) return -1;
    if (b.minutes !== null) return 1;
    return (PRIORITY_RANK[a.priority ?? "P4"] ?? 3) - (PRIORITY_RANK[b.priority ?? "P4"] ?? 3);
  });
}

function QuickAdd() {
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const createNote = useCreateNote();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"task" | "note">("task");
  const pending = createTask.isPending || createNote.isPending;
  const failed = createTask.isError || createNote.isError;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const title = text.trim();
    if (!title || pending) return;
    const done = () => {
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["todayOverview"] });
    };
    if (kind === "task") {
      createTask.mutate({ title, priority: "P3", status: "todo", dueDate: dueNoon(0) }, { onSuccess: done });
    } else {
      createNote.mutate({ title, content: "", folder: "Personal" }, { onSuccess: done });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={kind === "task" ? "Add a task for today..." : "Capture a quick note..."}
          className="h-11 bg-background/80"
          maxLength={200}
        />
        <Button type="submit" className="h-11 shrink-0" disabled={pending || !text.trim()}>
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        {(["task", "note"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            className={`rounded-full border px-3 py-1 font-medium capitalize transition-colors ${kind === option ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
          >
            {option}
          </button>
        ))}
        {failed && <span className="text-destructive">Couldn't save that. Try again.</span>}
      </div>
    </form>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export function DashboardContent() {
  const { data, isLoading, isError, error, refetch } = useTodayOverview() as {
    data: Overview | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
  };
  const { data: profile } = useUserProfile();
  const updateTask = useUpdateTaskStatus();

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your dashboard: {error?.message ?? "Unknown error"}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !data) return <DashboardSkeleton />;

  const currency = profile?.currency ?? "NGN";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = data.user.name?.split(" ")[0] ?? "there";

  const timeline = buildTimeline(data);
  const openTasks = data.priorityTasks.filter((task) => task.status !== "done").length;
  const doneTasks = data.priorityTasks.length - openTasks;

  const spent = data.finance.totalSpent;
  const budget = data.finance.monthlyBudget;
  const budgetPercent = budget > 0 ? Math.round((spent / budget) * 100) : null;
  const spendTone: Tone = budgetPercent === null ? "default" : budgetPercent >= 100 ? "danger" : budgetPercent >= 80 ? "warning" : "default";

  const goalAverage = data.goals.length
    ? Math.round(data.goals.reduce((sum, goal) => sum + (goal.target > 0 ? Math.min(100, (goal.progress / goal.target) * 100) : 0), 0) / data.goals.length)
    : null;

  const attention = data.overdueCount + data.documents.expiringSoon + data.passwordVault.weakCount;
  const attentionParts = [
    data.overdueCount > 0 && `${data.overdueCount}${data.overdueCount >= 10 ? "+" : ""} overdue`,
    data.documents.expiringSoon > 0 && `${data.documents.expiringSoon} expiring`,
    data.passwordVault.weakCount > 0 && `${data.passwordVault.weakCount} weak passwords`,
  ].filter(Boolean);

  const summary =
    openTasks === 0 && data.events.length === 0
      ? "Nothing is scheduled today. A good day for deep work."
      : `${openTasks} ${openTasks === 1 ? "task" : "tasks"} to do and ${data.events.length} ${data.events.length === 1 ? "event" : "events"} today.`;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/15 via-background to-violet-500/10 p-5 sm:p-7">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{greeting}, {firstName}</h1>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">{summary}</p>
        <QuickAdd />
      </section>

      <SetupChecklist />
      <DailyBriefCard />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={CheckSquare}
          label="Tasks today"
          value={`${doneTasks}/${data.priorityTasks.length}`}
          progress={data.priorityTasks.length ? (doneTasks / data.priorityTasks.length) * 100 : 0}
          hint={data.overdueCount > 0 ? `${data.overdueCount}${data.overdueCount >= 10 ? "+" : ""} overdue` : "On track"}
          tone={data.overdueCount > 0 ? "warning" : "default"}
          href="/app/tasks"
        />
        <StatCard
          icon={TrendingUp}
          label="Spent this month"
          value={formatCurrency(spent, currency)}
          progress={budgetPercent ?? undefined}
          hint={budget > 0 ? `${budgetPercent}% of ${formatCurrency(budget, currency)}` : "No budget set"}
          tone={spendTone}
          href="/app/finance"
        />
        <StatCard
          icon={Target}
          label="Goals"
          value={goalAverage === null ? "None" : `${goalAverage}%`}
          progress={goalAverage ?? undefined}
          hint={data.goals.length ? `${data.goals.length} active` : "Set your first goal"}
          href="/app/goals"
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs attention"
          value={attention}
          hint={attentionParts.length ? attentionParts.join(" · ") : "All clear"}
          tone={attention > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Today" icon={Calendar} action={<SectionLink href="/app/calendar">Calendar</SectionLink>}>
            {timeline.length === 0 ? (
              <EmptyState icon={Calendar} title="A clear day" body="Add a task above or schedule an event to see your day take shape." />
            ) : (
              <ol className="relative space-y-1">
                {timeline.map((item) => (
                  <li key={item.key} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40">
                    <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">{item.label}</span>
                    {item.kind === "task" ? (
                      <Checkbox
                        checked={item.status === "done"}
                        onCheckedChange={(checked) => updateTask.mutate({ id: item.id, status: checked ? "done" : "todo" })}
                      />
                    ) : (
                      <span className="mx-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <span className={`min-w-0 flex-1 truncate text-sm ${item.status === "done" ? "text-muted-foreground line-through" : ""}`}>{item.title}</span>
                    {item.kind === "event" ? (
                      <span className="rounded-full border px-2 py-0.5 text-[11px] capitalize text-muted-foreground">{item.type}</span>
                    ) : (
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{item.priority}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Recent notes" icon={FileText} action={<SectionLink href="/app/notes">All notes</SectionLink>}>
            {data.recentNotes.length === 0 ? (
              <EmptyState icon={FileText} title="No notes yet" body="Use the quick add above and choose Note." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {data.recentNotes.slice(0, 4).map((note) => (
                  <Link key={note.id} href={`/app/notes?id=${note.id}`} className="rounded-lg border p-3 transition-colors hover:border-primary/40">
                    <p className="truncate text-sm font-medium">{note.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.summary || "Empty note"}</p>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Focus" icon={Sparkles} className="border-primary/20 bg-primary/5">
            {data.suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">You're all caught up. No urgent suggestions right now.</p>
            ) : (
              <div className="space-y-3">
                {data.suggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={suggestion.id} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" variant="outline" asChild className="w-full">
              <Link href="/app/ai">Ask the AI assistant</Link>
            </Button>
          </Section>

          <Section title="Goals" icon={Target} action={<SectionLink href="/app/goals">Manage</SectionLink>}>
            {data.goals.length === 0 ? (
              <EmptyState icon={Target} title="No goals yet" action={<Button size="sm" variant="outline" asChild><Link href="/app/goals">Set a goal</Link></Button>} />
            ) : (
              <div className="space-y-4">
                {data.goals.map((goal) => (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate">{goal.title}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {goal.progress}/{goal.target}{goal.unit ? ` ${goal.unit}` : ""}
                      </span>
                    </div>
                    <ProgressBar value={goal.target > 0 ? (goal.progress / goal.target) * 100 : 0} />
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        <ModuleTile href="/app/study" icon={BookOpen} title="Study" metric={`${data.study.inProgress} active`} caption={data.study.nextMaterialTitle ? `Next: ${data.study.nextMaterialTitle}` : `${data.study.total} materials`} />
        <ModuleTile href="/app/health" icon={HeartPulse} title="Health today" metric={`${data.health.steps.toLocaleString()} steps`} caption={`${data.health.sleepHours.toFixed(1)} h sleep logged`} />
        <ModuleTile href="/app/documents" icon={ShieldCheck} title="Documents" metric={`${data.documents.total} files`} caption={`${data.documents.encrypted} private · ${data.documents.expiringSoon} expiring`} />
        <ModuleTile href="/app/password-vault" icon={KeyRound} title="Password vault" metric={`${data.passwordVault.totalItems} logins`} caption={data.passwordVault.weakCount > 0 ? `${data.passwordVault.weakCount} weak` : "No weak passwords"} />
        <ModuleTile href="/app/family" icon={Users} title="Family" metric={`${data.family.members.length} members`} caption="Chat and bedtime" />
      </div>

      <BecomeMerchantCard />
    </div>
  );
}