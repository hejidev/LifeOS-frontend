"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserCog, Plus, Trash2, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMerchantStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const ROLES = ["MANAGER", "CASHIER", "SALES_REP", "INVENTORY_CLERK"];

export default function StaffPage() {
  const { data: staff = [], isLoading } = useMerchantStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "CASHIER", pin: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createStaff.mutate(
      { ...form, email: form.email || undefined, phone: form.phone || undefined },
      { onSuccess: () => { setOpen(false); setForm({ name: "", email: "", phone: "", role: "CASHIER", pin: "" }); } }
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" /> Staff</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage who can operate the POS and what they can access.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add staff</Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(staff as any[]).map((s) => (
          <Card key={s.id}>
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email || s.phone || "No contact info"}</p>
                </div>
                <Badge variant={s.status === "ACTIVE" ? "secondary" : "destructive"}>{s.role}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {s.lastActiveAt ? `Last active ${new Date(s.lastActiveAt).toLocaleString()}` : "Never clocked in"}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline"
                  onClick={() => updateStaff.mutate({ id: s.id, data: { status: s.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" } })}
                >
                  <KeyRound className="mr-1 h-3 w-3" /> {s.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteStaff.mutate(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && staff.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-8">No staff added yet.</p>}
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add staff member</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Phone (optional)</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>POS PIN (4–6 digits)</Label><Input value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))} maxLength={6} required /></div>
            <Button type="submit" className="w-full" disabled={createStaff.isPending}>{createStaff.isPending ? "Adding..." : "Add staff"}</Button>
            {createStaff.isError && <p className="text-xs text-destructive text-center">{(createStaff.error as Error).message}</p>}
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}