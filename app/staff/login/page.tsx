"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Delete, Download, Loader2, Sparkles, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const PIN_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
const MIN_PIN = 4;
const MAX_PIN = 6;
const CODE_KEY = "lifeos_staff_store_code";

function rememberedCode() {
  try {
    return window.localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function StaffLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"identify" | "pin">("identify");
  const [storeCode, setStoreCode] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const pinRef = useRef("");
  pinRef.current = pin;

  useEffect(() => {
    const code = rememberedCode();
    if (code) setStoreCode(code);
  }, []);

  const pressKey = useCallback((key: string) => {
    if (loadingRef.current || key === "") return;
    if (key === "del") {
      setPin((current) => current.slice(0, -1));
      return;
    }
    setPin((current) => (current.length >= MAX_PIN ? current : current + key));
  }, []);

  const submit = useCallback(async () => {
    const value = pinRef.current;
    if (loadingRef.current || value.length < MIN_PIN) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/staff-session/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeCode: storeCode.trim(), name: name.trim(), pin: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Login failed");
      }
      try {
        window.localStorage.setItem(CODE_KEY, storeCode.trim());
      } catch {
        // storage unavailable
      }
      router.replace("/staff/pos");
    } catch (err) {
      setError(err instanceof TypeError ? "Can't reach the server. Check your connection." : err instanceof Error ? err.message : "Login failed");
      setPin("");
      setLoading(false);
      loadingRef.current = false;
    }
  }, [storeCode, name, router]);

  useEffect(() => {
    if (step !== "pin") return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        pressKey(event.key);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        pressKey("del");
      } else if (event.key === "Enter") {
        event.preventDefault();
        void submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, pressKey, submit]);

  function handleIdentify(event: React.FormEvent) {
    event.preventDefault();
    if (!storeCode.trim() || !name.trim()) return;
    setError(null);
    setStep("pin");
  }

  function backToIdentify() {
    setStep("identify");
    setPin("");
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-primary/5 px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">Staff Terminal</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {step === "identify" ? "Enter your store code and name" : `Enter your PIN, ${name.trim()}`}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {step === "identify" ? (
              <form onSubmit={handleIdentify} className="space-y-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Store className="h-3.5 w-3.5" /> Store code
                  </Label>
                  <Input
                    value={storeCode}
                    onChange={(event) => setStoreCode(event.target.value.toUpperCase())}
                    className="h-12 text-center font-mono text-lg tracking-widest"
                    maxLength={8}
                    autoFocus={!storeCode}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <User className="h-3.5 w-3.5" /> Your name
                  </Label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} className="h-12 text-center" autoFocus={!!storeCode} autoCorrect="off" required />
                </div>
                <Button type="submit" className="h-12 w-full" disabled={!storeCode.trim() || !name.trim()}>
                  Continue
                </Button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-center gap-3">
                  {Array.from({ length: Math.max(MIN_PIN, pin.length) }).map((_, index) => (
                    <div key={index} className={cn("h-4 w-4 rounded-full border-2 transition-colors", index < pin.length ? "border-primary bg-primary" : "border-border")} />
                  ))}
                </div>
                <p className={cn("min-h-4 text-center text-xs", error ? "text-destructive" : "text-muted-foreground")}>
                  {error ?? "Type on the keypad or your keyboard"}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {PIN_KEYS.map((key, index) =>
                    key === "" ? (
                      <div key={index} />
                    ) : key === "del" ? (
                      <button
                        key={index}
                        type="button"
                        aria-label="Delete"
                        onClick={() => pressKey(key)}
                        disabled={loading}
                        className="flex h-14 items-center justify-center rounded-xl bg-muted/40 transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        <Delete className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        key={index}
                        type="button"
                        onClick={() => pressKey(key)}
                        disabled={loading}
                        className="h-14 rounded-xl bg-muted/40 text-lg font-semibold transition-colors hover:bg-muted active:scale-95 disabled:opacity-50"
                      >
                        {key}
                      </button>
                    )
                  )}
                </div>
                <Button type="button" className="h-12 w-full" disabled={loading || pin.length < MIN_PIN} onClick={() => void submit()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
                <button type="button" onClick={backToIdentify} className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" /> Not {name.trim()}?
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 space-y-2 text-center text-xs text-muted-foreground">
          <p>
            Business owner?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in here
            </Link>
          </p>
          <Link href="/download" className="inline-flex items-center gap-2 hover:text-foreground">
            <Download className="h-3.5 w-3.5" /> Get the LifeOS app
          </Link>
        </div>
      </motion.div>
    </div>
  );
}