"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Delete, Sparkles, Store, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const PIN_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function StaffLoginPage() {
  const router = useRouter();
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Login failed");
      }
      router.push("/staff/pos");
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-linear-to-br from-background via-background to-primary/5">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg mb-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">Staff Terminal</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {step === "identify" ? "Enter your store code and name" : `Enter PIN for ${name}`}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {step === "identify" ? (
              <form onSubmit={handleIdentifySubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-xs"><Store className="h-3.5 w-3.5" /> Store code</Label>
                  <Input value={storeCode} onChange={(e) => setStoreCode(e.target.value.toUpperCase())} className="text-center tracking-widest font-mono text-lg h-12" maxLength={8} autoFocus required />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Your name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-center" required />
                </div>
                <button type="submit" className="w-full h-12 rounded-xl gradient-bg text-white font-semibold text-sm">Continue</button>
                <Link href={"/login"}>Back to Login</Link>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-center gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`h-4 w-4 rounded-full border-2 ${i < pin.length ? "bg-primary border-primary" : "border-border"} transition-colors`} />
                  ))}
                </div>
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
                <div className="grid grid-cols-3 gap-3">
                  {PIN_KEYS.map((k, i) =>
                    k === "" ? (
                      <div key={i} />
                    ) : k === "del" ? (
                      <button key={i} type="button" onClick={() => handlePinKey(k)} className="h-14 rounded-xl bg-muted/40 flex items-center justify-center hover:bg-muted transition-colors">
                        <Delete className="h-5 w-5" />
                      </button>
                    ) : (
                      <button key={i} type="button" onClick={() => handlePinKey(k)} disabled={loading} className="h-14 rounded-xl bg-muted/40 text-lg font-semibold hover:bg-muted transition-colors disabled:opacity-50">
                        {k}
                      </button>
                    )
                  )}
                </div>
                <button type="button" onClick={() => { setStep("identify"); setPin(""); setError(null); }} className="w-full text-xs text-muted-foreground hover:text-foreground">
                  ← Not {name}?
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}