import Link from "next/link";
import { ArrowRight, Banknote, BookOpen, Briefcase, Check, CheckSquare, CloudOff, FileText, Flame, FolderOpen, HeartPulse, KeyRound, Lock, MessageSquare, Printer, ScanLine, ShieldCheck, Sparkles, Store, Target, Users, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaButton } from "@/components/marketing/cta";
import { HeroPreview, PosPreview } from "@/components/marketing/mock";
import { ModuleTour } from "@/components/marketing/module-tour";
import { Reveal } from "@/components/marketing/reveal";
import type { PublicPlans } from "@/lib/marketing/plans";
import { seatText } from "@/lib/marketing/plans";

function Heading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="text-muted-foreground">{body}</p>}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground"><Sparkles className="h-3 w-3 text-primary" /> Built for life in Nigeria. Free to start.</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Your whole life, <span className="gradient-text">in one place</span></h1>
          <p className="max-w-xl text-lg text-muted-foreground">Tasks, money, health, family, documents and an AI assistant that knows your day. Plus a point-of-sale for your shop that keeps selling when the internet drops.</p>
          <div className="flex flex-wrap gap-3">
            <CtaButton guest="/signup" member="/app/dashboard" className="h-12 px-6 text-base">Get started free <ArrowRight className="ml-1.5 h-4 w-4" /></CtaButton>
            <Button asChild variant="outline" className="h-12 px-6 text-base"><Link href="#tour">See how it works</Link></Button>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {["No card needed to start", "Works on any device", "Download your data any time"].map((item) => <li key={item} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> {item}</li>)}
          </ul>
        </div>
        <Reveal delay={0.1}><HeroPreview /></Reveal>
      </div>
    </section>
  );
}

export function TrustBar() {
  const items: [LucideIcon, string][] = [[Wallet, "Naira-first"], [Lock, "Files stored privately"], [KeyRound, "Encrypted password vault"], [ShieldCheck, "Payments by Paystack"]];
  return (
    <section className="border-y bg-card/30">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 sm:px-6">
        {items.map(([Icon, label]) => <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 text-primary" /> {label}</li>)}
      </ul>
    </section>
  );
}

const MODULES: [LucideIcon, string, string][] = [
  [CheckSquare, "Tasks and calendar", "Priorities, due dates, subtasks, a board view and a calendar that shows what's due."],
  [FileText, "Notes", "Markdown notes that autosave, with folders, tags and one-tap conversion to tasks."],
  [Wallet, "Money", "Accounts, budgets, transfers and honest insights, shown in Naira first."],
  [Flame, "Habits", "Daily and weekly streaks with a 30-day history you can correct."],
  [HeartPulse, "Health", "Sleep, steps, water and workouts with weekly trends against your goals."],
  [Target, "Goals and career", "Targets with deadlines, skills you practise and achievements you keep."],
  [BookOpen, "Study", "A study timer that survives a closed tab, streaks and private study files."],
  [FolderOpen, "Documents", "IDs, certificates and policies kept private, with expiry tracking."],
  [KeyRound, "Password vault", "Logins, cards and secure notes encrypted before they're stored."],
  [Users, "Family space", "Sign-ins for your children, family chat and a bedtime for their LifeOS account."],
  [ShieldCheck, "Emergency profile", "Medical details and contacts behind a QR code and PIN for when it matters."],
  [Sparkles, "AI tools", "An assistant that knows your day, plus writing, translation, image editing and file conversion."],
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 space-y-12 px-4 py-20 sm:px-6">
      <Heading eyebrow="Everything in one place" title="Stop juggling a dozen apps" body="Each part of LifeOS is useful alone. Together they connect: search finds anything, and the assistant sees the whole picture." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(([Icon, title, body], index) => (
          <Reveal key={title} delay={(index % 3) * 0.05}>
            <div className="h-full space-y-3 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Tour() {
  return (
    <section id="tour" className="scroll-mt-20 border-y bg-card/30">
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-20 sm:px-6">
        <Heading eyebrow="See it in action" title="Built to feel like one product" />
        <ModuleTour />
        <p className="text-center text-xs text-muted-foreground">Previews show sample data.</p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ["Create a free account", "It takes a minute. No card needed."],
    ["Add what matters", "A short checklist walks you through your first task, account, habit and goal."],
    ["Let LifeOS connect it", "Search across everything, get a daily brief and ask the assistant anything about your day."],
  ];
  return (
    <section className="mx-auto max-w-6xl space-y-12 px-4 py-20 sm:px-6">
      <Heading eyebrow="Getting started" title="Useful in your first five minutes" />
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map(([title, body], index) => (
          <Reveal key={title} delay={index * 0.08}>
            <div className="space-y-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg text-sm font-bold text-white">{index + 1}</span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function MerchantSection({ plans }: { plans: PublicPlans | null }) {
  const features: [LucideIcon, string, string][] = [
    [CloudOff, "Sells offline", "Sales save on the device and upload when the connection returns."],
    [ScanLine, "Barcode scanning", "Scan with a scanner or the camera. Stock updates as you sell."],
    [Users, "Staff terminals", "Staff sign in with a store code and PIN, with roles for managers and cashiers."],
    [Store, "Several locations", "Run more than one shop with stock tracked per location."],
    [Banknote, "Credit and part payments", "Track what customers owe and take payments in instalments."],
    [Printer, "Receipts and printing", "Print from the browser, or over Bluetooth from the Android app."],
    [MessageSquare, "Team chat and alerts", "Message your staff and get low-stock and sales alerts."],
    [Briefcase, "Reports and exports", "Daily and shift reports, a cash register with variance, and CSV exports."],
  ];
  const starter = plans?.merchant.STARTER;

  return (
    <section id="merchants" className="scroll-mt-20 border-y bg-card/30">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">For business</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">A point-of-sale that keeps selling when the internet doesn't</h2>
          <p className="text-muted-foreground">Run your shop, your staff and your stock from LifeOS. Applications are reviewed by our team before your dashboard is activated.</p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {features.map(([Icon, title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <span><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{body}</span></span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <CtaButton guest="/signup" member="/app/merchant/apply" className="h-11 px-5">Apply as a merchant</CtaButton>
            <Button asChild variant="outline" className="h-11 px-5"><Link href="/download">Get the staff app</Link></Button>
            {starter && <span className="text-xs text-muted-foreground">Plans from {starter.priceLabelMonthly}</span>}
          </div>
          <p className="text-xs text-muted-foreground">The staff and owner app is available for Android. On iPhone and computers, the web terminal works in any modern browser. {starter && `Starter includes ${seatText(starter.staffLimit).toLowerCase()}.`}</p>
        </div>
        <Reveal delay={0.1}><PosPreview /></Reveal>
      </div>
    </section>
  );
}

export function Security() {
  const items: [LucideIcon, string, string][] = [
    [Lock, "Private files", "Documents, merchant ID and study files are stored privately and opened only through your account."],
    [KeyRound, "Encrypted vault", "Passwords and secure notes are encrypted with AES-256 before they're stored."],
    [ShieldCheck, "Protected emergency links", "Your emergency profile sits behind a PIN, with a lockout after repeated wrong tries."],
    [Sparkles, "You confirm AI actions", "The assistant prepares changes. Nothing is saved until you tap confirm."],
    [Check, "Sign-in alerts", "You get an email when your account is signed in to, and changing your password signs out every device."],
    [FileText, "Your data is yours", "Download a copy of everything you've saved, any time, from Settings."],
  ];
  return (
    <section className="mx-auto max-w-6xl space-y-12 px-4 py-20 sm:px-6">
      <Heading eyebrow="Privacy and security" title="Built to be trusted with the important things" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([Icon, title, body], index) => (
          <Reveal key={title} delay={(index % 3) * 0.05}>
            <div className="h-full space-y-3 rounded-2xl border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function PricingPreview({ plans }: { plans: PublicPlans | null }) {
  const tiers = plans ? (["STARTER", "PRO", "PREMIUM"] as const).map((key) => plans.user[key]) : [];
  return (
    <section className="border-t bg-card/30">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-20 sm:px-6">
        <Heading eyebrow="Pricing" title="Start free. Upgrade when you need more." body="The core of LifeOS is free. Paid plans unlock unlimited use of the AI tools." />
        {tiers.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 rounded-2xl border bg-card p-5"><p className="text-sm font-semibold">Free</p><p className="text-2xl font-bold">₦0</p><p className="text-xs text-muted-foreground">Every core module, plus {plans?.freeUsesPerTool} free uses on each AI tool.</p></div>
            {tiers.map((plan) => (
              <div key={plan.name} className="space-y-1.5 rounded-2xl border bg-card p-5"><p className="text-sm font-semibold">{plan.name}</p><p className="text-2xl font-bold">{plan.priceLabelMonthly}</p><p className="text-xs text-muted-foreground">{plan.description}</p></div>
            ))}
          </div>
        )}
        <div className="text-center"><Button asChild className="h-11 px-6"><Link href="/pricing">Compare plans <ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button></div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative mx-auto max-w-3xl space-y-6 px-4 py-24 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">Ready to run your life from one place?</h2>
        <p className="text-muted-foreground">Create a free account in a minute. Bring your shop when you're ready.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <CtaButton guest="/signup" member="/app/dashboard" className="h-12 px-7 text-base">Get started free</CtaButton>
          <Button asChild variant="outline" className="h-12 px-7 text-base"><Link href="/pricing">See pricing</Link></Button>
        </div>
      </div>
    </section>
  );
}