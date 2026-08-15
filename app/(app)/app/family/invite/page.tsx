"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Mail, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateFamilyInvite } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function InviteFamilyPage() {
  const createInvite = useCreateFamilyInvite();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CHILD");
  const [sent, setSent] = useState(false);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    createInvite.mutate({ email, role }, { onSuccess: () => { setSent(true); setEmail(""); } });
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Invite family</h1>
          <p className="text-muted-foreground mt-1">Send a real invite email to join your Family Space.</p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card className="max-w-md hover:border-primary/20 transition-colors">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Send invite</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="PARENT">Parent</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="CHILD">Child</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={createInvite.isPending}>{createInvite.isPending ? "Sending..." : "Send invite"}</Button>
              {createInvite.error && <p className="text-xs text-destructive text-center">{(createInvite.error as Error).message}</p>}
              {sent && <p className="text-xs text-emerald-500 text-center flex items-center justify-center gap-1"><CheckCircle2 className="h-3 w-3" /> Invite sent</p>}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}