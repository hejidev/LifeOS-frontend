"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users, Plus, Phone, Mail, Search, X, RotateCcw, Calendar,
  Crown, Star, Shield, Pencil, Filter, Send, Gift, Clock, UserX, Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBusinessCustomers, useCreateCustomer, useUpdateCustomer, useSendCustomerMessage, useBusinessProfile } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const QUICK_SEGMENTS = [
  { key: "all", label: "All customers", icon: Users },
  { key: "top", label: "Gold & VIP", icon: Crown },
  { key: "loyal", label: "Has loyalty points", icon: Gift },
  { key: "inactive", label: "Inactive 60+ days", icon: Clock },
  { key: "never", label: "Never ordered", icon: UserX },
] as const;

function getCustomerTier(totalSpent: number) {
  if (totalSpent >= 1000000) return { label: "VIP", icon: Crown, color: "bg-purple-500/10 text-purple-700 border-purple-500/30" };
  if (totalSpent >= 500000) return { label: "Gold", icon: Star, color: "bg-amber-500/10 text-amber-700 border-amber-500/30" };
  if (totalSpent >= 100000) return { label: "Silver", icon: Shield, color: "bg-slate-500/10 text-slate-700 border-slate-500/30" };
  return null;
}

export default function CustomersPage() {
  const { data: customers = [] } = useBusinessCustomers();
  const { data: profile } = useBusinessProfile();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const sendMessage = useSendCustomerMessage();
  const currency = (profile as any)?.currency ?? "NGN";

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [quickSegment, setQuickSegment] = useState<typeof QUICK_SEGMENTS[number]["key"]>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendResult, setSendResult] = useState<any>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createCustomer.mutate(
      { name: form.name, phone: form.phone || undefined, email: form.email || undefined, notes: form.notes || undefined },
      { onSuccess: () => { setOpen(false); setForm({ name: "", phone: "", email: "", notes: "" }); } }
    );
  }

  function openEdit(c: any) {
    setEditingCustomer(c);
    setEditForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", notes: c.notes ?? "" });
    setEditOpen(true);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateCustomer.mutate(
      {
        id: editingCustomer.id,
        data: {
          name: editForm.name,
          phone: editForm.phone || undefined,
          email: editForm.email || undefined,
          notes: editForm.notes || undefined,
        },
      },
      { onSuccess: () => { setEditOpen(false); setEditingCustomer(null); } }
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCompose() {
    setSendResult(null);
    setSubject("");
    setBody("");
    setComposeOpen(true);
  }

  function handleSend() {
    sendMessage.mutate(
      { customerIds: [...selected], subject, body },
      {
        onSuccess: (result: any) => setSendResult(result),
        onError: (err: any) => setSendResult({ error: err.message ?? "Failed to send" }),
      }
    );
  }

  const filteredCustomers = useMemo(() => {
    const now = Date.now();
    const bySearch = searchQuery
      ? (customers as any[]).filter(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.phone && c.phone.includes(searchQuery)) ||
            (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : (customers as any[]);

    return bySearch.filter((c) => {
      if (quickSegment === "top" && c.totalSpent < 500000) return false;
      if (quickSegment === "loyal" && (c.loyaltyPoints ?? 0) <= 0) return false;
      if (quickSegment === "inactive") {
        if (!c.lastOrderAt) return false;
        const daysSince = (now - new Date(c.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 60) return false;
      }
      if (quickSegment === "never" && c.orderCount > 0) return false;
      return true;
    });
  }, [customers, searchQuery, quickSegment]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Manage your customer relationships</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="outline" onClick={openCompose} className="gap-2 h-9 sm:h-10 text-sm">
              <Mail className="h-4 w-4" /> Message ({selected.size})
            </Button>
          )}
          <Button onClick={() => setOpen(true)} className="gap-2 h-9 sm:h-10 text-sm">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap gap-2">
        {QUICK_SEGMENTS.map((seg) => (
          <button
            key={seg.key}
            onClick={() => setQuickSegment(seg.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              quickSegment === seg.key
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
            )}
          >
            <seg.icon className="h-3.5 w-3.5" /> {seg.label}
          </button>
        ))}
      </motion.div>

      <motion.div variants={item}>
        <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Customer Directory</CardTitle>
              {searchQuery && (
                <Button size="sm" variant="ghost" onClick={() => setSearchQuery("")} className="h-7 sm:h-8 text-[10px] sm:text-xs">
                  <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
              />
            </div>

            {!customers || customers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No customers yet.</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add your first customer
                </Button>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No customers match this view.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(filteredCustomers as any[]).map((c) => {
                  const tier = getCustomerTier(c.totalSpent);
                  const TierIcon = tier?.icon;
                  return (
                    <Card key={c.id} className={cn("group hover:border-primary/40 hover:shadow-md transition-all duration-200", selected.has(c.id) && "border-primary/40 bg-primary/5")}>
                      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs sm:text-sm font-semibold truncate">{c.name}</p>
                              {tier && TierIcon && (
                                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border", tier.color)}>
                                  <TierIcon className="h-2.5 w-2.5 mr-0.5" />
                                  {tier.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => c.email && toggleSelect(c.id)}
                            disabled={!c.email}
                            title={c.email ? "Select for messaging" : "No email on file"}
                            className={cn(
                              "h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                              !c.email
                                ? "opacity-30 cursor-not-allowed border-border"
                                : selected.has(c.id)
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {selected.has(c.id) && <Check className="h-3 w-3" />}
                          </button>
                        </div>

                        <div className="space-y-1.5 sm:space-y-2">
                          {c.phone && (
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                              <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">{c.phone}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                              <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground truncate">{c.email}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 sm:pt-3 border-t border-border/50 space-y-1.5 sm:space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Total spent</span>
                            <span className="text-xs sm:text-sm font-semibold text-primary">{currency} {c.totalSpent.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-muted-foreground">Loyalty points</span>
                            <span className="font-medium text-sm text-emerald-600">{c.loyaltyPoints ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Orders</span>
                            <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-2 py-0.5">{c.orderCount}</Badge>
                          </div>
                          {c.lastOrderAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> Last order</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">{new Date(c.lastOrderAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <Button variant="outline" size="sm" className="flex-1 h-7 sm:h-8 text-[10px] sm:text-xs" onClick={() => openEdit(c)}>
                            <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" /> Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pt-2">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Customer Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Enter customer name"
                required
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+234 XXX XXX XXXX"
                  className="pl-9 h-9 sm:h-10 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="customer@example.com"
                  className="pl-9 h-9 sm:h-10 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes..."
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <Button type="submit" className="w-full h-9 sm:h-11 text-sm" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? (
                <span className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Add Customer"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 sm:space-y-4 pt-2">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Customer Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="pl-9 h-9 sm:h-10 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="pl-9 h-9 sm:h-10 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Notes (optional)</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <Button type="submit" className="w-full h-9 sm:h-11 text-sm" disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? (
                <span className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Save changes"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Message {selected.size} customer{selected.size !== 1 ? "s" : ""}</DialogTitle></DialogHeader>
          {sendResult ? (
            <div className="space-y-3 pt-2">
              {sendResult.error ? (
                <p className="text-sm text-destructive">{sendResult.error}</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="text-emerald-600 font-medium">{sendResult.sent} sent</p>
                  {sendResult.skippedNoEmail > 0 && <p className="text-muted-foreground">{sendResult.skippedNoEmail} skipped (no email on file)</p>}
                  {sendResult.failed > 0 && <p className="text-destructive">{sendResult.failed} failed to send</p>}
                </div>
              )}
              <Button className="w-full" onClick={() => setComposeOpen(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. We miss you — here's 500 points" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message</Label>
                <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." />
              </div>
              <p className="text-[11px] text-muted-foreground">Only sent to recipients with an email on file — {selected.size} selected here.</p>
              <Button className="w-full" onClick={handleSend} disabled={!subject.trim() || !body.trim() || sendMessage.isPending}>
                <Send className="h-3.5 w-3.5 mr-1.5" /> {sendMessage.isPending ? "Sending..." : `Send to ${selected.size}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}