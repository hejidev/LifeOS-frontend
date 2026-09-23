"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { AuthShell } from "@/components/auth/auth-shell";

const MODULES = [
  { label: "Link expires", value: "15 min" },
  { label: "Delivery", value: "email" },
  { label: "Account status", value: "unaffected" },
];


const WHITE_INPUT = "!bg-white !text-neutral-900 placeholder:!text-neutral-400";

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
    <AuthShell
      prompt="recover-access"
      headline="Lost the keys? We'll issue a new one."
      modules={MODULES}
    >
      {submitted ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-muted">Check your inbox</h1>
            <p className="text-muted mt-2 text-sm">
              If <span className="text-background font-medium">{email}</span> is registered, a reset link is on its way.
            </p>
          </div>
          <Link href="/login" className="text-sm text-primary hover:underline block">Back to sign in</Link>
        </motion.div>
      ) : (
        <>
          <div className="mb-6">
            <p className="font-mono text-xs text-muted mb-1">&gt; password/recover</p>
            <h1 className="text-2xl font-bold text-background">Reset your password</h1>
            <p className="text-muted mt-1 text-sm">Enter your email and we'll send you a reset link</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-background">Email address</Label>
              <Input className={WHITE_INPUT} id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
            {error && <p className="text-xs text-center text-destructive">{error}</p>}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}