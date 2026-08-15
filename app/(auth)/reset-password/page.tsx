"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff, Check, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  { icon: ShieldCheck, text: "Your new password is encrypted immediately" },
  { icon: KeyRound, text: "You'll be signed out everywhere else once set" },
];

function passwordChecks(password: string) {
  return [
    { label: "12+ characters", pass: password.length >= 12 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Lowercase letter", pass: /[a-z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
    { label: "Symbol", pass: /[^A-Za-z0-9]/.test(password) },
  ];
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const checks = passwordChecks(password);
  const allPass = checks.every((c) => c.pass);
  const matches = password.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!matches) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? "This reset link is invalid or has expired");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold">Invalid reset link</h1>
        <p className="text-muted-foreground text-sm">This link is missing or malformed.</p>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline block">Request a new link</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Password updated</h1>
          <p className="text-muted-foreground mt-2 text-sm">You can now sign in with your new password.</p>
        </div>
        <Button className="w-full" onClick={() => router.push("/login")}>Go to sign in</Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="text-muted-foreground mt-1 text-sm">Make it strong — you'll use this to sign in from now on</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="pr-10" required />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="grid grid-cols-2 gap-1 pt-1">
              {checks.map((c) => (
                <div key={c.label} className={cn("flex items-center gap-1 text-[11px]", c.pass ? "text-emerald-500" : "text-muted-foreground")}>
                  <Check className={cn("h-3 w-3", !c.pass && "opacity-30")} /> {c.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type={showPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
          {confirmPassword.length > 0 && !matches && <p className="text-[11px] text-destructive">Passwords don't match</p>}
        </div>

        <Button type="submit" className="w-full" disabled={loading || !allPass || !matches}>
          {loading ? "Updating..." : "Update password"}
        </Button>
        {error && <p className="text-xs text-center text-destructive">{error}</p>}
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden gradient-bg p-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <Link href="/" className="relative flex items-center gap-2 z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><Sparkles className="h-5 w-5 text-white" /></div>
          <span className="text-xl font-bold text-white">LifeOS</span>
        </Link>
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">Almost there. Choose a strong new password.</h2>
          <div className="space-y-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.text} className="flex items-center gap-3 text-white/90">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 shrink-0"><h.icon className="h-4 w-4" /></div>
                <p className="text-sm">{h.text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/60">© {new Date().getFullYear()} LifeOS</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-bg"><Sparkles className="h-5 w-5 text-white" /></div>
              <span className="text-2xl font-bold gradient-text">LifeOS</span>
            </Link>
          </div>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}