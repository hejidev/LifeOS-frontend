"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSun,
  Calendar,
  Sparkles,
  TrendingUp,
  Quote,
  RefreshCw,
  ArrowRight,
  FileText,
  BookOpen,
  ShieldCheck,
  Lock,
  Upload,
  HeartPulse,
  MapPin,
  Users,
  KeyRound,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useTodayOverview, useUpdateTaskStatus, useRandomQuote } from "@/lib/hooks/use-life-data";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { PasswordVaultSummary } from "@/types/life";
import { BecomeMerchantCard } from "../merchant/become-merchant-card";

const weatherIcons = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  "partly-cloudy": CloudSun,
};

const priorityColors = {
  P1: "destructive",
  P2: "warning",
  P3: "secondary",
  P4: "outline",
} as const;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{children}</p>;
}

type DashboardOverview = {
  family: any;
  user: { name: string };
  weather: {
    icon: keyof typeof weatherIcons;
    location: string;
    temp: number;
    condition: string;
    high: number;
    low: number;
  };
  events: Array<{
    id: string;
    title: string;
    start: string;
    type: string;
  }>;
  quote: { text: string; author: string };
  priorityTasks: Array<{
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    priority: "P1" | "P2" | "P3" | "P4";
    suggestedSchedule?: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    progress: number;
    target: number;
    unit?: string;
  }>;
  finance: {
    totalIncome: number;
    savings: number;
    totalSpent: number;
    monthlyBudget: number;
    insight: string;
  };
  recentNotes: Array<{
    id: string;
    title: string;
    summary: string;
  }>;
  documents: {
    total: number;
    encrypted: number;
    expiringSoon: number;
    recentlyOpened: number;
    linkedTasks: number;
    linkedNotes: number;
    recent: Array<{
      id: string;
      title: string;
      category: string;
      encrypted: boolean;
      expiresSoon?: boolean;
    }>;
  };
  study: {
    total: number;
    inProgress: number;
    completed: number;
    nextMaterialTitle?: string;
  };
  health: {
    sleepHours: number;
    steps: number;
  };
  passwordVault: PasswordVaultSummary;
  suggestions: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
};

export function DashboardContent() {
  const { data, isLoading, isError, error, refetch } = useTodayOverview() as {
    data: DashboardOverview | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
  };
  const updateTask = useUpdateTaskStatus();
  const { data: quote, refetch: refreshQuote } = useRandomQuote();
  const { user } = useAuthStore();

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="text-sm text-destructive">Failed to load dashboard: {error?.message ?? "Unknown error"}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  const WeatherIcon = weatherIcons[data.weather.icon];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const quoteData = quote || data.quote;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-10"
    >
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}, {user?.name ? ` ${user.name}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")} - Here&apos;s your day at a glance
        </p>
      </motion.div>

      {/* Today at a Glance */}
      <div>
        <SectionLabel>Today at a Glance</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={item}>
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{data.weather.location}</p>
                    <p className="text-3xl font-bold mt-1">{data.weather.temp}°F</p>
                    <p className="text-sm text-muted-foreground">{data.weather.condition}</p>
                  </div>
                  <WeatherIcon className="h-12 w-12 text-primary/60" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">H: {data.weather.high}° L: {data.weather.low}°</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} className="lg:col-span-2">
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Today&apos;s Schedule
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/calendar">Open <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events today - great day for deep work!</p>
                ) : (
                  data.events.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground w-16 shrink-0">{format(new Date(event.start), "h:mm a")}</span>
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span className="flex-1">{event.title}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{event.type}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <Quote className="h-5 w-5 text-primary/60 mb-3" />
                <p className="text-sm italic leading-relaxed">&ldquo;{quoteData.text}&rdquo;</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">- {quoteData.author}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refreshQuote()}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Merchant CTA */}
      <motion.div variants={item}>
        <BecomeMerchantCard />
      </motion.div>

      {/* Your Focus */}
      <div>
        <SectionLabel>Your Focus</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Priority Tasks</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/tasks">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.priorityTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing due today - you're clear.</p>
                ) : (
                  data.priorityTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/50 transition-colors">
                      <Checkbox
                        checked={task.status === "done"}
                        onCheckedChange={(checked) => updateTask.mutate({ id: task.id, status: checked ? "done" : "todo" })}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        {task.suggestedSchedule && <p className="text-xs text-primary">{task.suggestedSchedule}</p>}
                      </div>
                      <Badge variant={priorityColors[task.priority]} className="text-[10px] shrink-0">{task.priority}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} className="lg:col-span-2">
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Goals
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/goals">Open <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.goals.length === 0 ? (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-sm text-muted-foreground">No active goals yet.</p>
                    <Button size="sm" variant="outline" asChild><Link href="/app/goals">Set a goal</Link></Button>
                  </div>
                ) : (
                  data.goals.map((goal) => (
                    <div key={goal.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate">{goal.title}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {goal.progress}/{goal.target}{goal.unit ? ` ${goal.unit}` : ""}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full gradient-bg transition-all"
                          style={{ width: `${Math.min((goal.progress / goal.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Life & Growth */}
      <div>
        <SectionLabel>Life & Growth</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={item}>
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-primary" /> Health
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/health">Open <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Last night sleep</p>
                    <p className="text-sm font-semibold">{data.health.sleepHours.toFixed(1)} h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Today steps</p>
                    <p className="text-sm font-semibold">{data.health.steps.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {data.health.sleepHours > 0 || data.health.steps > 0 ? "Based on your latest health log." : "No health logs yet - add one in the Health module."}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Family
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/family">Open <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="text-sm font-semibold">{data.family.members.length}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Sharing location</p>
                      <p className="text-sm font-semibold">
                        {data.family.members.filter((m: { locationSharing: any }) => m.locationSharing).length}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {data.family.members.length > 0 ? data.family.insight : "Add family members to start managing screen time and safety."}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Study
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/study">Open <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-card/60 border border-border/60 p-2">
                    <p className="text-[11px] text-muted-foreground">Total</p>
                    <p className="text-sm font-semibold">{data.study.total}</p>
                  </div>
                  <div className="rounded-lg bg-card/60 border border-border/60 p-2">
                    <p className="text-[11px] text-muted-foreground">In progress</p>
                    <p className="text-sm font-semibold">{data.study.inProgress}</p>
                  </div>
                  <div className="rounded-lg bg-card/60 border border-border/60 p-2">
                    <p className="text-[11px] text-muted-foreground">Completed</p>
                    <p className="text-sm font-semibold">{data.study.completed}</p>
                  </div>
                </div>
                {data.study.nextMaterialTitle ? (
                  <p className="text-xs text-muted-foreground">
                    Next up: <span className="font-medium text-foreground">{data.study.nextMaterialTitle}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No study session queued. Add material in the Study module.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Notes & Documents */}
      <div>
        <SectionLabel>Notes & Documents</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div variants={item}>
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Notes</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/notes">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recentNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                ) : (
                  data.recentNotes.map((note) => (
                    <Link
                      key={note.id}
                      href={`/app/notes?id=${note.id}`}
                      className="block rounded-lg p-3 hover:bg-accent/50 transition-colors"
                    >
                      <p className="text-sm font-medium">{note.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{note.summary}</p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Document Vault
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/documents">View vault <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold">{data.documents.total}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                    <p className="text-xs text-muted-foreground">Encrypted</p>
                    <p className="text-lg font-semibold">{data.documents.encrypted}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                    <p className="text-xs text-muted-foreground">Expiring soon</p>
                    <p className="text-lg font-semibold">{data.documents.expiringSoon}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                    <p className="text-xs text-muted-foreground">Recently opened</p>
                    <p className="text-lg font-semibold">{data.documents.recentlyOpened}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.documents.recent.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-accent/50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.category}{doc.expiresSoon ? " - expiring soon" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {doc.encrypted && <Lock className="h-3 w-3 text-primary" />}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/app/documents?id=${doc.id}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="sm" asChild className="w-full">
                  <Link href="/app/documents"><Upload className="mr-2 h-3 w-3" /> Upload document</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Finance & Security */}
      <div>
        <SectionLabel>Finance & Security</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div variants={item}>
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex flex-row justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Finance
                </CardTitle>
                <Button variant="outline" asChild>
                  <Link href="/app/finance"><TrendingUp className="mr-2 h-4 w-4" /> Review budget</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Income {formatCurrency(data.finance.totalIncome)} - Savings {formatCurrency(data.finance.savings)}
                </p>
                <p className="text-2xl font-bold">{formatCurrency(data.finance.totalSpent)}</p>
                <p className="text-sm text-muted-foreground">of {formatCurrency(data.finance.monthlyBudget)} budget</p>
                {data.finance.insight && <Badge variant="warning" className="mt-3 text-xs">{data.finance.insight}</Badge>}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" /> Password Vault
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/password-vault">Open <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Vault items</p>
                    <p className="text-sm font-semibold">{data.passwordVault.totalItems}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Weak passwords</p>
                      <p className="text-sm font-semibold">{data.passwordVault.weakCount}</p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {data.passwordVault.totalItems > 0 ? data.passwordVault.insight : "Add your first login to see your security score."}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* AI Insight */}
      <motion.div variants={item}>
        <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Insight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">You're all caught up - no urgent suggestions right now.</p>
            ) : (
              data.suggestions.slice(0, 3).map((s, i) => (
                <div key={s.id} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{s.reason}</p>
                  </div>
                </div>
              ))
            )}
            <Button size="sm" asChild>
              <Link href="/app/ai">Ask AI for more <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}