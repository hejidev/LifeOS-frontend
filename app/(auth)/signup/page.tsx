"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff, Check, ListChecks, ShoppingBag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  { icon: ListChecks, text: "Tasks, notes, health & finance in one place" },
  { icon: ShoppingBag, text: "Merchant tools when you're ready to sell" },
  { icon: CheckCircle2, text: "Free forever core — upgrade only if you want to" },
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

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const register = useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) => api.post("/auth/register", input),
    onSuccess: () => router.push("/login"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    register.mutate({ name, email, password });
  }

  const checks = passwordChecks(password);
  const allPass = checks.every((c) => c.pass);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden gradient-bg p-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 30%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <Link href="/" className="relative flex items-center gap-2 z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><Sparkles className="h-5 w-5 text-white" /></div>
          <span className="text-xl font-bold text-white">LifeOS</span>
        </Link>
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">Start organizing your whole life, free.</h2>
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-muted-foreground mt-1 text-sm">Start organizing your life for free</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" placeholder="Alex Morgan" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 rounded" required />
              <span className="text-xs text-muted-foreground">
                I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={register.isPending || !allPass || !agreed}>
              {register.isPending ? "Creating account..." : "Create account"}
            </Button>
            {register.error && <p className="text-xs text-center text-destructive">{(register.error as Error).message}</p>}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}