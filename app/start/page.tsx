"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Check, Download, PlusSquare, Share, ShoppingCart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "owner" | "staff";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "lifeos_app_mode";
const DESTINATIONS: Record<Mode, string> = { owner: "/merchant/dashboard", staff: "/staff/pos" };

const OPTIONS = [
  {
    mode: "owner" as const,
    icon: BarChart3,
    title: "I own the business",
    text: "Sales, stock, staff, reports and team chat in one dashboard.",
    cta: "Open dashboard",
  },
  {
    mode: "staff" as const,
    icon: ShoppingCart,
    title: "I work here",
    text: "Ring up sales, scan products and count stock at the till.",
    cta: "Open terminal",
  },
];

function savedMode(): Mode | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "owner" || value === "staff" ? value : null;
  } catch {
    return null;
  }
}

function remember(mode: Mode | null) {
  try {
    if (mode) window.localStorage.setItem(STORAGE_KEY, mode);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

function runningInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function onIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function Logo({ pulse = false }: { pulse?: boolean }) {
  return (
    <div className={cn("inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg shadow-lg shadow-primary/20", pulse && "animate-pulse")}>
      <Sparkles className="h-7 w-7 text-white" />
    </div>
  );
}

export default function StartPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [keep, setKeep] = useState(true);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("mode");

    if (requested === "owner" || requested === "staff") {
      remember(requested);
      router.replace(DESTINATIONS[requested]);
      return;
    }

    const standalone = runningInstalled();
    const saved = savedMode();
    setInstalled(standalone);
    setIos(onIos());

    if (saved && standalone && !params.has("change")) {
      router.replace(DESTINATIONS[saved]);
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const choose = useCallback(
    (mode: Mode) => {
      remember(keep ? mode : null);
      router.push(DESTINATIONS[mode]);
    },
    [keep, router]
  );

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Logo pulse />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-primary/5 px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Welcome to LifeOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Who's using this device?</p>
        </div>

        <div className="space-y-3">
          {OPTIONS.map((option, index) => (
            <motion.button
              key={option.mode}
              type="button"
              onClick={() => choose(option.mode)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * (index + 1) }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className="group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/50"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <option.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{option.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{option.text}</p>
                <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
                  {option.cta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        <button type="button" onClick={() => setKeep((current) => !current)} className="mx-auto flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <span className={cn("flex h-4 w-4 items-center justify-center rounded border", keep ? "border-primary bg-primary" : "border-border")}>
            {keep ? <Check className="h-3 w-3 text-primary-foreground" /> : null}
          </span>
          Remember my choice on this device
        </button>

        {!installed ? (
          <div className="rounded-2xl border border-dashed bg-card/50 p-4">
            {prompt ? (
              <button type="button" onClick={install} className="flex w-full items-center justify-center gap-2 rounded-xl gradient-bg py-3 text-sm font-semibold text-white">
                <Download className="h-4 w-4" /> Install LifeOS on this device
              </button>
            ) : ios ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="text-sm font-medium text-foreground">Install on your iPhone or iPad</p>
                <p className="flex items-center gap-2">
                  <Share className="h-4 w-4 shrink-0" /> In Safari, tap the Share button
                </p>
                <p className="flex items-center gap-2">
                  <PlusSquare className="h-4 w-4 shrink-0" /> Choose "Add to Home Screen"
                </p>
                <p>Open the app once and pick owner or staff. You only do this once per device.</p>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Use your browser's menu and choose <span className="font-medium text-foreground">Install LifeOS</span> to add it to your device.
              </p>
            )}
          </div>
        ) : null}

        <Link href="/download" className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <Download className="h-3.5 w-3.5" /> Android app and other ways to get LifeOS
        </Link>
      </motion.div>
    </div>
  );
}