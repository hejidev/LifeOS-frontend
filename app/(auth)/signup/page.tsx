"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";

const MODULES = [
  { label: "Setup time", value: "~45 sec" },
  { label: "Core plan", value: "$0 / mo" },
  { label: "Modules included", value: "12" },
  { label: "Upgrade", value: "optional" },
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

const WHITE_INPUT = "!bg-white !text-neutral-900 placeholder:!text-neutral-400";

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
  const strength = checks.filter((c) => c.pass).length;

  return (
    <AuthShell
      prompt="register"
      headline="Provision your own operating system. Free at the core."
      modules={MODULES}
    >
      <div className="mb-6">
        <p className="font-mono text-xs text-muted mb-1">&gt; account/new</p>
        <h1 className="text-2xl font-bold text-muted">Create your account</h1>
        <p className="text-muted mt-1 text-sm">Start organizing your life for free</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-background">Full name</Label>
          <Input id="name" placeholder="Alex Morgan" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={cn("font-mono text-background", WHITE_INPUT)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-background">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={cn("font-mono text-background", WHITE_INPUT)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-background">Password</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={cn("font-mono pr-10 text-background", WHITE_INPUT)} required />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-background cursor-pointer" tabIndex={-1}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {password.length > 0 && (
            <div className="space-y-2 pt-1.5">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i < strength ? (strength <= 2 ? "bg-destructive" : strength <= 4 ? "bg-amber-500" : "bg-emerald-500") : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {checks.map((c) => (
                  <div key={c.label} className={cn("flex items-center gap-1 text-[11px]", c.pass ? "text-emerald-500" : "text-muted-foreground")}>
                    <Check className={cn("h-3 w-3", !c.pass && "opacity-30")} /> {c.label}
                  </div>
                ))}
              </div>
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
    </AuthShell>
  );
}