"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/lib/hooks/use-auth";

const slug = (name: string) => name.trim().toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "").slice(0, 20);

export default function FamilySignInPage() {
  const router = useRouter();
  const login = useLogin();
  const [form, setForm] = useState({ code: "", name: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const email = `${slug(form.name)}.${form.code.trim().toLowerCase()}@family.invalid`;
    login.mutate(
      { email, password: form.password },
      {
        onSuccess: () => router.replace("/app/family"),
        onError: () => setError("Check the family code, your name and your password."),
      }
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <CardTitle>Family sign in</CardTitle>
          <p className="text-sm text-muted-foreground">Ask a parent for your family code.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label>Family code</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={6} className="font-mono tracking-widest" required />
            </div>
            <div className="space-y-1">
              <Label>Your name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}