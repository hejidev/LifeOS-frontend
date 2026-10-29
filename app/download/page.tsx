"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Laptop, Smartphone, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PlatformKey = "desktop" | "android" | "ios";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL;
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL;
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL;

const PLATFORMS: { key: PlatformKey; title: string; subtitle: string; icon: LucideIcon }[] = [
  { key: "desktop", title: "Windows, Mac & Linux", subtitle: "Opens in its own window from your Start menu or Dock", icon: Laptop },
  { key: "android", title: "Android", subtitle: "Phones and tablets", icon: Smartphone },
  { key: "ios", title: "iPhone & iPad", subtitle: "Adds to your Home Screen from Safari", icon: Smartphone },
];

function detectPlatform(): PlatformKey {
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOs) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((text, index) => (
        <li key={text} className="flex gap-3 text-sm text-muted-foreground">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {index + 1}
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}

export default function DownloadPage() {
  const [detected, setDetected] = useState<PlatformKey | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setDetected(detectPlatform());
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }, [installEvent]);

  const ordered = detected
    ? [...PLATFORMS].sort((a, b) => Number(b.key === detected) - Number(a.key === detected))
    : PLATFORMS;

  function renderActions(key: PlatformKey) {
    const canPrompt = installEvent !== null && detected === key;

    if (key === "desktop") {
      return (
        <>
          {canPrompt ? (
            <Button className="w-full" onClick={install}>
              <Download className="mr-2 h-4 w-4" /> Install on this computer
            </Button>
          ) : null}
          <Steps
            items={[
              "Open this page in Chrome or Edge.",
              "Click the install icon at the right end of the address bar, or open the browser menu and choose Install LifeOS Staff.",
              "On a Mac with Safari 17 or later, choose File, then Add to Dock.",
            ]}
          />
          <p className="text-xs text-muted-foreground">Firefox on desktop can't install web apps. Use Chrome or Edge.</p>
        </>
      );
    }

    if (key === "android") {
      return (
        <>
          {PLAY_STORE_URL ? (
            <Button asChild className="w-full">
              <a href={PLAY_STORE_URL}>Get it on Google Play</a>
            </Button>
          ) : null}
          {APK_URL ? (
            <Button asChild className="w-full" variant={PLAY_STORE_URL ? "outline" : "default"}>
              <a href={APK_URL}>
                <Download className="mr-2 h-4 w-4" /> Download the Android app
              </a>
            </Button>
          ) : null}
          {canPrompt ? (
            <Button variant="outline" className="w-full" onClick={install}>
              Install the web version instead
            </Button>
          ) : null}
          <Steps
            items={
              APK_URL
                ? [
                  "Open the downloaded file. If Chrome warns about the file type, choose Keep.",
                  "If Android asks, allow installs from your browser, then tap Install. Play Protect may show an unrecognised app notice: choose More details, then Install anyway.",
                  "Open LifeOS Staff and sign in with your store code, name and PIN.",
                ]
                : [
                  "Open this page in Chrome.",
                  "Open the browser menu and choose Install app.",
                  "Open LifeOS Staff and sign in.",
                ]
            }
          />
        </>
      );
    }

    return (
      <>
        {APP_STORE_URL ? (
          <>
            <Button asChild className="w-full">
              <a href={APP_STORE_URL}>Download on the App Store</a>
            </Button>
            <Link href="/start" className="text-primary underline">Open the start page, then Add to Home Screen</Link>
          </>
        ) : null}
        <Steps
          items={[
            "Open the staff login page in Safari.",
            "Tap the Share button.",
            "Choose Add to Home Screen, then tap Add.",
            "Open LifeOS Staff from your Home Screen and sign in.",
          ]}
        />
        <Button asChild variant="outline" className="w-full">
          <Link href="/staff/login">Open staff login</Link>
        </Button>
      </>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative mx-auto max-w-xl space-y-5">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Get LifeOS Staff</h1>
          <p className="text-sm text-muted-foreground">Ring up sales, scan barcodes and track your shift from any device.</p>
        </div>

        {installed ? (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <p className="flex-1 text-sm">You're already using the installed app.</p>
              <Button asChild size="sm">
                <Link href="/staff/login">Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {ordered.map((platform, index) => (
          <motion.div
            key={platform.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Card className={detected === platform.key ? "border-primary/40" : ""}>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <platform.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{platform.title}</p>
                      {detected === platform.key ? <Badge variant="secondary">Your device</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{platform.subtitle}</p>
                  </div>
                </div>
                {renderActions(platform.key)}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        <p className="text-center text-xs text-muted-foreground">
          Already installed?{" "}
          <Link href="/staff/login" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}