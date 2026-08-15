"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageCircle, Send, CheckCircle2, Clock, MapPin, PhoneCall, LocationEdit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/lib/hooks/use-auth";
import { useSubmitContactForm } from "@/lib/hooks/use-life-data";
import Link from "next/link";

const REASONS = ["General enquiry", "Support", "Billing", "Partnership", "Other"];
const INFO = [
  { icon: Mail, label: "Email us", value: "support@lifeos.app" },
  { icon: PhoneCall, label: "Call us", value: "+1-234-567-890" },
  { icon: LocationEdit, label: "Address", value: "234 Belerin New York City" },
  { icon: Clock, label: "Response time", value: "Usually within 24 hours" },
  { icon: MapPin, label: "Built for", value: "Teams and individuals, everywhere" },
];

export default function ContactPage() {
  const { data: me } = useMe();
  const submitForm = useSubmitContactForm();
  const [form, setForm] = useState({ name: "", email: "", subject: REASONS[0], message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitForm.mutate(form, { onSuccess: () => { setSent(true); setForm({ name: "", email: "", subject: REASONS[0], message: "" }); } });
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/10 blur-3xl -z-10" />

      <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">Let's talk</h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-lg mx-auto">
            Questions, feedback, partnership ideas, or just curious about LifeOS — send us a message.
          </p>
        </motion.div>

        {(me as any)?.user && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="max-w-2xl mx-auto mb-8">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-sm">Already have an account? Chat with support directly for a faster reply.</p>
                </div>
                <Button asChild className="w-full sm:w-auto shrink-0"><Link href="/app/contact">Open support chat</Link></Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="lg:col-span-2 space-y-4">
            {INFO.map((i) => (
              <Card key={i.label}>
                <CardContent className="pt-6 flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0"><i.icon className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{i.label}</p>
                    <p className="text-sm font-medium">{i.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-3">
            <Card className="border-primary/10">
              <CardContent className="pt-6 sm:pt-8">
                {sent ? (
                  <div className="text-center py-8 space-y-3">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                    <p className="text-sm font-medium">Message sent</p>
                    <p className="text-xs text-muted-foreground">We'll reply to your email soon.</p>
                    <Button variant="outline" size="sm" onClick={() => setSent(false)}>Send another message</Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
                      <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></div>
                    </div>
                    <div className="space-y-1">
                      <Label>Reason</Label>
                      <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}>
                        {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><Label>Message</Label><Textarea rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required /></div>
                    <Button type="submit" className="w-full" disabled={submitForm.isPending}>
                      <Send className="mr-2 h-4 w-4" /> {submitForm.isPending ? "Sending..." : "Send message"}
                    </Button>
                    {submitForm.isError && <p className="text-xs text-destructive text-center">{(submitForm.error as Error).message}</p>}
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}