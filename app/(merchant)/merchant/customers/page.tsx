"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Plus, Phone, Mail, Search, X, RotateCcw, MapPin,
  Calendar, TrendingUp, DollarSign, Crown, Star, Shield,
  TimerIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBusinessCustomers, useCreateCustomer } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function CustomersPage() {
  const { data: customers = [] } = useBusinessCustomers();
  const createCustomer = useCreateCustomer();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [searchQuery, setSearchQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createCustomer.mutate(
      { name: form.name, phone: form.phone || undefined, email: form.email || undefined, notes: form.notes || undefined },
      { onSuccess: () => { setOpen(false); setForm({ name: "", phone: "", email: "", notes: "" }); } }
    );
  }

  const filteredCustomers = searchQuery
    ? (customers as any[]).filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.phone && c.phone.includes(searchQuery)) || (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())))
    : customers;

  const currency = "NGN";

  // Calculate customer tiers based on total spent
  const getCustomerTier = (totalSpent: number) => {
    if (totalSpent >= 1000000) return { label: "VIP", icon: Crown, color: "bg-purple-500/10 text-purple-700 border-purple-500/30" };
    if (totalSpent >= 500000) return { label: "Gold", icon: Star, color: "bg-amber-500/10 text-amber-700 border-amber-500/30" };
    if (totalSpent >= 100000) return { label: "Silver", icon: Shield, color: "bg-slate-500/10 text-slate-700 border-slate-500/30" };
    return null;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Manage your customer relationships</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 h-9 sm:h-10 text-sm">
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
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
                <p className="text-sm text-muted-foreground">No customers match "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(filteredCustomers as any[]).map((c) => {
                  const tier = getCustomerTier(c.totalSpent);
                  const TierIcon = tier?.icon;
                  return (
                    <Card key={c.id} className="group hover:border-primary/40 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-semibold truncate">{c.name}</p>
                              {tier && (
                                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border", tier.color)}>
                                  <TimerIcon className="h-2.5 w-2.5 mr-0.5" />
                                  {tier.label}
                                </Badge>
                              )}
                            </div>
                          </div>
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
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Orders</span>
                            <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-2 py-0.5">{c.orderCount}</Badge>
                          </div>
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
    </motion.div>
  );
}