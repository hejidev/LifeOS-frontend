"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Delete, Store, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useLogin } from "@/lib/hooks/use-auth";
import { api, setAccessToken } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

const MODULES = [
  { label: "Tasks", value: "synced" },
  { label: "Finance", value: "tracked" },
  { label: "Health", value: "logged" },
  { label: "Merchant tools", value: "standing by" },
];

const WHITE_INPUT = "!bg-white !text-neutral-900 placeholder:!text-neutral-400";

function OAuthButton({ provider, icon }: { provider: "google" | "github" | "apple"; icon: React.ReactNode }) {
  return (
    <Button variant="outline" className={cn("w-full text-background", WHITE_INPUT)} onClick={() => { window.location.href = `${API_URL}/auth/${provider}`; }}>
      {icon}
      Continue with {provider[0].toUpperCase() + provider.slice(1)}
    </Button>
  );
}

const PIN_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function LoginPage() {
  const [mode, setMode] = useState<"user" | "staff">("user");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "staff") setMode("staff");
  }, []);

  return (
    <AuthShell
      prompt="authenticate"
      headline="Sign back into the system running your life."
      modules={MODULES}
    >
      <div className="inline-flex rounded-full bg-primary p-1 mb-6 w-full">
        <button
          onClick={() => setMode("user")}
          className={cn("flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors", mode === "user" ? "bg-foreground text-background" : "text-foreground hover:text-muted-foreground")}
        >
          Personal login
        </button>
        <button
          onClick={() => setMode("staff")}
          className={cn("flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors", mode === "staff" ? "bg-foreground text-background" : "text-foreground hover:text-muted-foreground")}
        >
          Staff login
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "user" ? (
          <motion.div key="user" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
            <UserLoginForm />
          </motion.div>
        ) : (
          <motion.div key="staff" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
            <StaffLoginForm />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

function UserLoginForm() {
  const login = useLogin();
  const [method, setMethod] = useState<"password" | "email-code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingToken, setPendingToken] = useState("");
  const [code, setCode] = useState("");
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeLoading, setEmailCodeLoading] = useState(false);
  const [emailCodeError, setEmailCodeError] = useState<string | null>(null);

  function finishLogin(data: any) {
    setAccessToken(data.accessToken);
    document.cookie = "lifeos_authed=1; path=/; SameSite=Strict";
    document.cookie = `lifeos_role=${data.user.role}; path=/; SameSite=Strict`;
    const role = data.user.role as string;
    if (role === "SUPER_ADMIN") { window.location.href = "/super-admin"; return; }
    if (role === "ADMIN") { window.location.href = "/admin"; return; }
    window.location.href = "/app/dashboard";
  }

  useEffect(() => {
    if (!login.isSuccess || !login.data || login.data.requires2FA) return;
    (async () => {
      const role = login.data.user.role as string;
      if (role === "SUPER_ADMIN") { window.location.href = "/super-admin"; return; }
      if (role === "ADMIN") { window.location.href = "/admin"; return; }
      try {
        const status = await api.get("/merchant/status");
        if (status.status === "APPROVED" && status.planStatus === "ACTIVE") {
          window.location.href = "/merchant/dashboard";
          return;
        }
      } catch {
      }
      window.location.href = "/app/dashboard";
    })();
  }, [login.isSuccess, login.data]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: (data: any) => {
          if (data.requires2FA) {
            setRequires2FA(true);
            setPendingToken(data.pendingToken);
          }
        },
      }
    );
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault();
    setTwoFAError(null);
    try {
      const res = await fetch(`${API_URL}/auth/verify-2fa`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, code }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Invalid code");
      }
      const data = await res.json();
      finishLogin(data);
    } catch (err: any) {
      setTwoFAError(err.message);
    }
  }

  async function requestEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setEmailCodeError(null);
    setEmailCodeLoading(true);
    try {
      const data = await api.post("/auth/request-login-code", { email });
      if (data.challengeId) setEmailChallengeId(data.challengeId);
    } catch (err: any) {
      setEmailCodeError(err.message ?? "Unable to send a code.");
    } finally {
      setEmailCodeLoading(false);
    }
  }

  async function verifyEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setEmailCodeError(null);
    setEmailCodeLoading(true);
    try {
      const data = await api.post("/auth/verify-login-code", { challengeId: emailChallengeId, code: emailCode });
      if (data.requires2FA) {
        setRequires2FA(true);
        setPendingToken(data.pendingToken);
        return;
      }
      finishLogin(data);
    } catch (err: any) {
      setEmailCodeError(err.message ?? "Unable to verify the code.");
    } finally {
      setEmailCodeLoading(false);
    }
  }

  if (requires2FA) {
    return (
      <div>
        <div className="mb-6">
          <p className="font-mono text-xs text-background mb-1">&gt; verify-identity</p>
          <h1 className="text-2xl font-bold">Two-factor authentication</h1>
          <p className="text-card mt-1 text-sm">Enter the 6-digit code from your authenticator app</p>
        </div>
        <form onSubmit={handleVerify2FA} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-background">Authentication code</Label>
            <Input id="code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} className={cn("font-mono text-center tracking-[0.5em] text-background", WHITE_INPUT)} />
          </div>
          <Button type="submit" className="w-full text-background">Verify</Button>
          {twoFAError && <p className="text-xs text-center text-destructive">{twoFAError}</p>}
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-xs text-muted mb-1">&gt; session/new</p>
        <h1 className="text-2xl font-bold text-background">Welcome back</h1>
        <p className="text-card mt-1 text-sm">Sign in to your LifeOS account</p>
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-lg bg-primary p-1 text-sm">
        <button type="button" onClick={() => { setMethod("password"); setEmailChallengeId(""); setEmailCodeError(null); }} className={cn("rounded-md px-3 py-2 transition-colors", method === "password" ? "bg-white font-medium shadow-sm text-primary" : "text-white")}>Password</button>
        <button type="button" onClick={() => { setMethod("email-code"); setEmailCodeError(null); }} className={cn("rounded-md px-3 py-2 transition-colors", method === "email-code" ? "bg-white font-medium shadow-sm text-primary" : "text-white")}><Mail className="mr-1 inline h-3.5 w-3.5" />Email code</button>
      </div>

      <div className="space-y-3">
        <OAuthButton provider="google" icon={<svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>} />
      </div>

      <div className="relative my-5">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary rounded px-2 text-xs text-foreground">or</span>
      </div>

      {method === "password" ? <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-background">Email</Label>
          <Input className={WHITE_INPUT} id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-background">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">Forgot password?</Link>
          </div>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={cn("pr-10", WHITE_INPUT)} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={login.isPending}>{login.isPending ? "Signing in..." : "Sign in"}</Button>
        {login.error && <p className="text-xs text-center text-destructive">{login.error.message}</p>}
      </form> : emailChallengeId ? <form onSubmit={verifyEmailCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-code">Enter the code sent to {email}</Label>
          <Input id="email-code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} required className={cn("font-mono text-center tracking-[0.5em]", WHITE_INPUT)} />
          <p className="text-xs text-muted-foreground">The code expires in 10 minutes and can only be used once.</p>
        </div>
        <Button type="submit" className="w-full" disabled={emailCodeLoading || emailCode.length !== 6}>{emailCodeLoading ? "Verifying..." : "Verify and sign in"}</Button>
        <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => { setEmailChallengeId(""); setEmailCode(""); }}>Use a different email</button>
        {emailCodeError && <p className="text-xs text-center text-destructive">{emailCodeError}</p>}
      </form> : <form onSubmit={requestEmailCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-code-address">Email</Label>
          <Input className={WHITE_INPUT} id="email-code-address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <p className="text-xs text-muted-foreground">We will send a secure 6-digit sign-in code to this address.</p>
        </div>
        <Button type="submit" className="w-full" disabled={emailCodeLoading}>{emailCodeLoading ? "Sending code..." : "Send sign-in code"}</Button>
        {emailCodeError && <p className="text-xs text-center text-destructive">{emailCodeError}</p>}
      </form>}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account? <Link href="/signup" className="text-primary hover:underline">Sign up</Link>
      </p>
    </div>
  );
}

function StaffLoginForm() {
  const [step, setStep] = useState<"identify" | "pin">("identify");
  const [storeCode, setStoreCode] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleIdentifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeCode.trim() || !name.trim()) return;
    setStep("pin");
  }

  async function submitLogin(finalPin: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/staff-session/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeCode, name, pin: finalPin }),
      });
      if (res.status === 401) {
        if (typeof window !== "undefined") window.location.href = "/login?mode=staff";
        throw new Error("Session expired — redirecting to login");
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Login failed");
      }
      window.location.href = "/staff/pos";
    } catch (err: any) {
      setError(err.message);
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  function handlePinKey(key: string) {
    if (key === "del") return setPin((p) => p.slice(0, -1));
    if (key === "") return;
    if (pin.length >= 6) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) submitLogin(next);
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2"><Store className="h-5 w-5 text-primary" /></div>
        <p className="font-mono text-xs text-muted-foreground mb-1">&gt; terminal/identify</p>
        <h1 className="text-xl font-bold">Staff Terminal</h1>
        <p className="text-muted-foreground mt-1 text-sm">{step === "identify" ? "Enter your store code and name" : `Enter PIN for ${name}`}</p>
      </div>

      {step === "identify" ? (
        <form onSubmit={handleIdentifySubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-background"><Store className="h-3.5 w-3.5" /> Store code</Label>
            <Input value={storeCode} onChange={(e) => setStoreCode(e.target.value.toUpperCase())} className={cn("text-center tracking-widest font-mono text-lg h-12", WHITE_INPUT)} maxLength={8} required />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-background"><User className="h-3.5 w-3.5" /> Your name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className={cn("h-12 text-center", WHITE_INPUT)} required />
          </div>
          <Button type="submit" className="w-full h-12">Continue</Button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="flex justify-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn("h-4 w-4 rounded-full border-2 transition-colors", i < pin.length ? "bg-primary border-primary" : "border-primary")} />
            ))}
          </div>
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          <div className="grid grid-cols-3 gap-3">
            {PIN_KEYS.map((k, i) =>
              k === "" ? <div key={i} /> : k === "del" ? (
                <button key={i} type="button" onClick={() => handlePinKey(k)} className="h-14 rounded-xl bg-primary/40 flex items-center justify-center hover:bg-muted transition-colors">
                  <Delete className="h-5 w-5" />
                </button>
              ) : (
                <button key={i} type="button" onClick={() => handlePinKey(k)} disabled={loading} className="h-14 rounded-xl bg-muted/40 text-lg font-semibold hover:bg-primary transition-colors disabled:opacity-50">
                  {k}
                </button>
              )
            )}
          </div>
          <button type="button" onClick={() => { setStep("identify"); setPin(""); setError(null); }} className="w-full text-xs text-muted-foreground hover:text-background cursor-pointer">
            ← Not {name}?
          </button>
        </div>
      )}
    </div>
  );
}