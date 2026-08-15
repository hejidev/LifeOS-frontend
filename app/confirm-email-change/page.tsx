"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export default function ConfirmEmailChangePage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Confirming your new email address…");

  const confirm = async () => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setStatus("error"); setMessage("This confirmation link is missing its security token."); return; }
    try {
      await api.post("/platform-admin/support/email-change/confirm", { token });
      setStatus("success"); setMessage("Your email address has been updated. For security, sign in again using the new address.");
    } catch (error) {
      setStatus("error"); setMessage(error instanceof Error ? error.message : "We could not confirm this email change.");
    }
  };

  useEffect(() => { void confirm(); }, []);
  const Icon = status === "loading" ? LoaderCircle : status === "success" ? CheckCircle2 : ShieldAlert;

  return <main className="grid min-h-screen place-items-center bg-muted/20 p-6"><section className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm"><Icon className={`mx-auto h-10 w-10 ${status === "loading" ? "animate-spin text-primary" : status === "success" ? "text-emerald-500" : "text-destructive"}`} /><h1 className="mt-5 text-2xl font-bold">{status === "success" ? "Email updated" : status === "error" ? "Unable to confirm" : "Securing your account"}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>{status !== "loading" && <Button className="mt-6" asChild><a href="/login">Go to sign in</a></Button>}</section></main>;
}
