"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSendBroadcast } from "@/lib/hooks/use-life-data";

export default function BroadcastPage() {
  const sendBroadcast = useSendBroadcast();
  const [form, setForm] = useState({ title: "", message: "", audience: "ALL" as "ALL" | "USERS" | "MERCHANTS" });
  const [sentCount, setSentCount] = useState<number | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSentCount(null);
    sendBroadcast.mutate(form, {
      onSuccess: (d: any) => { setSentCount(d.sentTo); setForm({ title: "", message: "", audience: "ALL" }); },
    });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Radio className="h-6 w-6 text-primary" /> Broadcast</h1>
        <p className="text-muted-foreground mt-1">Send a platform notification to a segment of users.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Audience</Label>
              <div className="flex gap-2">
                {(["ALL", "USERS", "MERCHANTS"] as const).map((a) => (
                  <Button key={a} type="button" size="sm" variant={form.audience === a ? "default" : "outline"} onClick={() => setForm((f) => ({ ...f, audience: a }))}>
                    {a === "ALL" ? "Everyone" : a === "USERS" ? "Users only" : "Merchants only"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Message</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required /></div>
            <Button type="submit" className="w-full" disabled={sendBroadcast.isPending}>
              <Send className="mr-2 h-4 w-4" /> {sendBroadcast.isPending ? "Sending..." : "Send broadcast"}
            </Button>
            {sentCount !== null && <p className="text-xs text-emerald-500 text-center">Sent to {sentCount} recipients.</p>}
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}