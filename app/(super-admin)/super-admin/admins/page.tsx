"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Plus, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useAdmins, useCreateAdmin, useGrantPermission, useRevokePermission,
} from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const CAPABILITIES = [
  { key: "MANAGE_USERS", label: "Manage users" },
  { key: "MANAGE_MERCHANTS", label: "Review merchants" },
  { key: "MANAGE_CONTENT", label: "Manage content" },
  { key: "SEND_BROADCASTS", label: "Send broadcasts" },
  { key: "VIEW_ANALYTICS", label: "View analytics" },
];

export default function AdminsPage() {
  const { data: admins = [], isLoading } = useAdmins();
  const createAdmin = useCreateAdmin();
  const grant = useGrantPermission();
  const revoke = useRevokePermission();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createAdmin.mutate(form, { onSuccess: () => { setOpen(false); setForm({ name: "", email: "", password: "" }); } });
  }

  function togglePermission(userId: string, capability: string, has: boolean) {
    if (has) revoke.mutate({ id: userId, capability });
    else grant.mutate({ id: userId, capability });
  }

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Admins</h1>
          <p className="text-muted-foreground mt-1">Create admin accounts and control exactly what each one can do.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New admin</Button>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {(admins as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No admins yet.</p>
        ) : (
          (admins as any[]).map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-6 space-y-3">
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CAPABILITIES.map((c) => {
                    const has = a.permissions.includes(c.key);
                    return (
                      <button
                        key={c.key}
                        onClick={() => togglePermission(a.id, c.key, has)}
                        className="inline-flex"
                      >
                        <Badge variant={has ? "default" : "outline"} className="cursor-pointer flex items-center gap-1">
                          {has && <Check className="h-3 w-3" />} {c.label}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create admin</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Temporary password</Label><Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required /></div>
            <Button type="submit" className="w-full" disabled={createAdmin.isPending}>{createAdmin.isPending ? "Creating..." : "Create admin"}</Button>
            {createAdmin.isError && <p className="text-xs text-destructive text-center">{(createAdmin.error as Error).message}</p>}
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}