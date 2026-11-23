"use client";

import { useState } from "react";
import { Check, CheckSquare, Flame, FolderOpen, HeartPulse, Lock, Moon, Sparkles, Users, Wallet, type LucideIcon } from "lucide-react";
import { MockBar, MockChart, MockStat, MockWindow } from "@/components/marketing/mock";
import { cn } from "@/lib/utils";

function PlanPreview() {
  const rows: [string, string, boolean][] = [["Review quarterly report", "P1", false], ["Team stand-up", "10:30 AM", false], ["Call the landlord", "P2", false], ["Pay electricity bill", "P3", true]];
  return (
    <MockWindow title="Tasks and calendar">
      <div className="space-y-1.5">
        {rows.map(([title, tag, done]) => (
          <div key={title} className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", done && "border-primary bg-primary text-primary-foreground")}>{done && <Check className="h-3 w-3" />}</span>
            <span className={cn("flex-1 text-xs", done && "text-muted-foreground line-through")}>{title}</span>
            <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <div key={index} className={cn("rounded-lg border py-2", index === 3 && "border-primary bg-primary/10 text-primary")}>
            {day}
            <div className="mx-auto mt-1 h-1 w-1 rounded-full bg-primary/60" style={{ opacity: [1, 0, 1, 1, 0, 0, 1][index] }} />
          </div>
        ))}
      </div>
    </MockWindow>
  );
}

function MoneyPreview() {
  const categories: [string, number, string, "primary" | "amber" | "red"][] = [["Food & groceries", 88, "₦96,000 of ₦110,000", "amber"], ["Transport", 54, "₦27,000 of ₦50,000", "primary"], ["Airtime & data", 112, "₦11,200 of ₦10,000", "red"]];
  return (
    <MockWindow title="Finance · November">
      <div className="grid grid-cols-3 gap-2">
        <MockStat label="Income" value="₦420,000" />
        <MockStat label="Spent" value="₦265,300" />
        <MockStat label="Saved" value="37%" />
      </div>
      <MockChart values={[30, 55, 20, 70, 45, 25, 90, 35, 60, 40, 75, 30, 50, 65]} highlight={12} />
      <div className="space-y-2.5">
        {categories.map(([name, value, text, tone]) => (
          <div key={name} className="space-y-1">
            <div className="flex justify-between text-[11px]"><span>{name}</span><span className="text-muted-foreground">{text}</span></div>
            <MockBar value={Math.min(100, value)} tone={tone} />
          </div>
        ))}
      </div>
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px]">Over budget in Airtime & data. At this pace you'll spend about ₦310,000 this month.</p>
    </MockWindow>
  );
}

function HealthPreview() {
  const habits: [string, string, boolean][] = [["Morning walk", "12-day streak", true], ["Drink 2L of water", "5-day streak", true], ["Read 20 pages", "At risk", false]];
  return (
    <MockWindow title="Health and habits">
      <div className="grid grid-cols-3 gap-2">
        <MockStat label="Sleep" value="7.5 h" />
        <MockStat label="Steps" value="8,420" />
        <MockStat label="Water" value="6 / 8" />
      </div>
      <MockChart values={[60, 80, 100, 100, 40, 100, 70]} highlight={6} />
      <div className="space-y-1.5">
        {habits.map(([title, note, done]) => (
          <div key={title} className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <Flame className={cn("h-3.5 w-3.5 shrink-0", done ? "text-orange-500" : "text-muted-foreground")} />
            <span className="flex-1 text-xs">{title}</span>
            <span className={cn("text-[10px]", done ? "text-muted-foreground" : "text-amber-600")}>{note}</span>
          </div>
        ))}
      </div>
    </MockWindow>
  );
}

function FamilyPreview() {
  return (
    <MockWindow title="Family space">
      <div className="space-y-2">
        <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-xs"><span className="mb-0.5 block text-[10px] text-muted-foreground">Mum · Parent</span>Dinner is at 7. Is the homework done?</div>
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-xs text-primary-foreground">Almost, 10 more minutes!</div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Moon className="h-4 w-4" /></span>
        <div className="text-xs"><p className="font-medium">Bedtime · 21:00 to 06:00</p><p className="text-muted-foreground">Chidi's LifeOS account is locked until 6:00 AM</p></div>
      </div>
    </MockWindow>
  );
}

function VaultPreview() {
  return (
    <MockWindow title="Documents and vault">
      <div className="space-y-1.5">
        {[["Passport", "Expires in 24 days", "text-amber-600"], ["Insurance policy", "Expires in 8 months", "text-muted-foreground"]].map(([title, note, tone]) => (
          <div key={title} className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="flex-1 text-xs">{title}</span>
            <span className={cn("text-[10px]", tone)}>{note}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {[["Gmail", "Strong"], ["GTBank", "Strong"]].map(([name, strength]) => (
          <div key={name} className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <span className="flex-1 text-xs">{name}</span>
            <span className="font-mono text-xs text-muted-foreground">••••••••••••</span>
            <span className="rounded-full border px-2 py-0.5 text-[10px] text-emerald-600">{strength}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Passwords and notes are encrypted before they're stored.</p>
    </MockWindow>
  );
}

function AiPreview() {
  return (
    <MockWindow title="AI assistant">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-xs text-primary-foreground">Add a task to call Mum tomorrow at 5pm</div>
      <div className="flex gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-3 w-3" /></span>
        <div className="flex-1 space-y-2">
          <p className="text-xs">I've prepared that for you. Confirm and I'll add it.</p>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">New task</p>
            <p className="text-xs font-medium">Call Mum</p>
            <p className="text-[11px] text-muted-foreground">Due tomorrow · P3</p>
            <div className="mt-2 flex gap-2"><span className="rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground">Confirm</span><span className="px-2 py-1 text-[11px] text-muted-foreground">Dismiss</span></div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

const TABS: { key: string; label: string; icon: LucideIcon; title: string; body: string; points: string[]; Preview: () => React.JSX.Element }[] = [
  { key: "plan", label: "Plan", icon: CheckSquare, title: "A day that plans itself around you", body: "See what's due, what's scheduled and what's slipping in one view. Add a task or event in seconds.", points: ["Priorities, due dates, subtasks and a board view", "A calendar that shows tasks beside events", "Search everything with Ctrl+K"], Preview: PlanPreview },
  { key: "money", label: "Money", icon: Wallet, title: "Know where your money goes", body: "Add your accounts, set a monthly budget and see honest insights about your pace. Amounts show in Naira first.", points: ["Bank, cash and mobile-money accounts with real balances", "Budgets per category and transfers between accounts", "Month-by-month history and spending insights"], Preview: MoneyPreview },
  { key: "health", label: "Health", icon: HeartPulse, title: "Build habits that stick", body: "Track sleep, movement and water against goals you set, and keep streaks that mean something.", points: ["Daily and weekly streaks you can correct", "Sleep, steps, water and workouts with weekly trends", "Habits and health in the same place as your tasks"], Preview: HealthPreview },
  { key: "family", label: "Family", icon: Users, title: "A calmer home for your children", body: "Create sign-ins for your children, chat together and set a bedtime. Parents can see family messages.", points: ["Child accounts that sign in with a family code", "Bedtime that locks your child's LifeOS account", "A guide to lock devices with Family Link and Screen Time"], Preview: FamilyPreview },
  { key: "vault", label: "Private", icon: FolderOpen, title: "Important things, kept private", body: "Keep documents, logins and an emergency profile where you can find them and nobody else can.", points: ["Documents stored privately, with expiry tracking", "Passwords and secure notes encrypted before storage", "An emergency profile with a QR code and PIN"], Preview: VaultPreview },
  { key: "ai", label: "AI", icon: Sparkles, title: "An assistant that knows your day", body: "Ask what to focus on, or just say what to add. It prepares the item and waits for your confirmation.", points: ["Knows your tasks, calendar, habits and spending", "Never saves anything without your tap", "Plus tools to write, translate, edit images and convert files"], Preview: AiPreview },
];

export function ModuleTour() {
  const [active, setActive] = useState(TABS[0].key);
  const tab = TABS.find((item) => item.key === active) ?? TABS[0];

  return (
    <div>
      <div role="tablist" aria-label="Product tour" className="flex gap-2 overflow-x-auto pb-2 lg:justify-center">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.key === active}
            onClick={() => setActive(item.key)}
            className={cn("flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors", item.key === active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
          >
            <item.icon className="h-4 w-4" /> {item.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <div key={tab.key} role="tabpanel" className="space-y-4">
          <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{tab.title}</h3>
          <p className="text-muted-foreground">{tab.body}</p>
          <ul className="space-y-2.5">
            {tab.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {point}</li>
            ))}
          </ul>
        </div>
        <tab.Preview />
      </div>
    </div>
  );
}