"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Phone, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBusinessCustomers, useCreateCustomer } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function CustomersPage() {
  const { data: customers = [] } = useBusinessCustomers();
  const createCustomer = useCreateCustomer();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createCustomer.mutate(
      { name: form.name, phone: form.phone || undefined, email: form.email || undefined, notes: form.notes || undefined },
      { onSuccess: () => { setOpen(false); setForm({ name: "", phone: "", email: "", notes: "" }); } }
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 sm:space-y-6 px-1">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> Customers
        </h1>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add customer
        </Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(customers as any[]).map((c) => (
          <Card key={c.id} className="hover:border-primary/20 transition-colors">
            <CardContent className="p-4">
              <p className="text-sm font-medium truncate">{c.name}</p>
              <div className="mt-1.5 space-y-1">
                {c.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" /> {c.phone}</p>
                )}
                {c.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /> {c.email}</p>
                )}
                {!c.phone && !c.email && <p className="text-xs text-muted-foreground">No contact info</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {customers.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">No customers yet.</p>
        )}
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add customer</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <Button type="submit" className="w-full" disabled={createCustomer.isPending}>{createCustomer.isPending ? "Saving..." : "Save"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}