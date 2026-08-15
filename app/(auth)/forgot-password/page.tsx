"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Mail, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";

const HIGHLIGHTS = [
  { icon: Mail, text: "We'll email you a secure reset link" },
  { icon: Clock, text: "The link expires after 15 minutes" },
  { icon: ShieldCheck, text: "Your account stays protected either way" },
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden gradient-bg p-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <Link href="/" className="relative flex items-center gap-2 z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><Sparkles className="h-5 w-5 text-white" /></div>
          <span className="text-xl font-bold text-white">LifeOS</span>
        </Link>
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">Locked out happens. Let's get you back in.</h2>
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

          {submitted ? (
            <div className="text-center space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Check your inbox</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  If <span className="text-foreground font-medium">{email}</span> is registered, a reset link is on its way.
                </p>
              </div>
              <Link href="/login" className="text-sm text-primary hover:underline block">Back to sign in</Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Reset your password</h1>
                <p className="text-muted-foreground mt-1 text-sm">Enter your email and we'll send you a reset link</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
                {error && <p className="text-xs text-center text-destructive">{error}</p>}
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Remembered it? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}