"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound, ShieldCheck, Lock, Globe, Smartphone, Banknote, CreditCard,
  Sparkles, Plus, Pencil, Trash2, Eye, EyeOff, Copy, Star, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useVaultDashboard, useRevealVaultItem, useCreateVaultItem, useUpdateVaultItem, useDeleteVaultItem,
} from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const CATEGORY_ICONS: Record<string, any> = { WEBSITE: Globe, APP: Smartphone, BANK: Banknote, CARD: CreditCard, NOTE: Lock };
const CATEGORY_LABELS: Record<string, string> = { WEBSITE: "Website", APP: "App", BANK: "Bank", CARD: "Card", NOTE: "Note" };

function generatePassword(length = 16) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()-_=+";
  const bytes = new Uint32Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

function clientStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score += 25;
  if (pw.length >= 12) score += 15;
  if (/[a-z]/.test(pw)) score += 10;
  if (/[A-Z]/.test(pw)) score += 10;
  if (/[0-9]/.test(pw)) score += 15;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 25;
  score = Math.min(score, 100);
  const label = score >= 70 ? "strong" : score >= 40 ? "medium" : "weak";
  return { score, label };
}

function strengthBadge(label: string) {
  if (label === "strong") return <Badge variant="secondary" className="text-[10px]">Strong</Badge>;
  if (label === "medium") return <Badge variant="outline" className="text-[10px]">Medium</Badge>;
  return <Badge variant="destructive" className="text-[10px]">Weak</Badge>;
}

const emptyForm = { label: "", username: "", password: "", url: "", category: "WEBSITE", notes: "", tags: "", favorite: false };

export default function PasswordVaultPage() {
  const { data, isLoading } = useVaultDashboard();
  const reveal = useRevealVaultItem();
  const createItem = useCreateVaultItem();
  const updateItem = useUpdateVaultItem();
  const deleteItem = useDeleteVaultItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (isLoading || !data) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  const { items, stats, insight } = data as any;
  const formStrength = clientStrength(form.password);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(vaultItem: any) {
    setEditingId(vaultItem.id);
    setForm({
      label: vaultItem.label, username: vaultItem.username ?? "", password: "",
      url: vaultItem.url ?? "", category: vaultItem.category, notes: vaultItem.notes ?? "",
      tags: (vaultItem.tags ?? []).join(", "), favorite: vaultItem.favorite,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      label: form.label,
      username: form.username || undefined,
      ...(form.password ? { password: form.password } : {}),
      url: form.url || undefined,
      category: form.category,
      notes: form.notes || undefined,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      favorite: form.favorite,
    };
    if (editingId) {
      updateItem.mutate({ id: editingId, data: payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createItem.mutate(payload as any, { onSuccess: () => setDialogOpen(false) });
    }
  }

  async function toggleReveal(id: string) {
    if (revealedPasswords[id]) {
      setRevealedPasswords((prev) => { const next = { ...prev }; delete next[id]; return next; });
      return;
    }
    const revealedItem = await reveal.mutateAsync(id);
    setRevealedPasswords((prev) => ({ ...prev, [id]: revealedItem.password ?? "" }));
  }

  async function copyPassword(id: string) {
    let password = revealedPasswords[id];
    if (!password) {
      const revealedItem = await reveal.mutateAsync(id);
      password = revealedItem.password ?? "";
    }
    await navigator.clipboard.writeText(password);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2"><KeyRound className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Password Vault</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Secure vault for your login credentials and passwords.</p>
        </div>
        <Button onClick={openCreate} className="text-xs sm:text-sm"><Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Add credential</Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total items", value: stats.totalItems, icon: KeyRound },
          { label: "Weak passwords", value: stats.weakCount, icon: ShieldCheck },
          { label: "Reused passwords", value: stats.reusedCount, icon: RefreshCw },
          { label: "Old passwords", value: stats.oldPasswords, icon: RefreshCw },
        ].map((s) => (
          <Card key={s.label} className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-lg sm:text-xl font-semibold">{s.value}</p></CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm sm:text-base">Your credentials</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Input placeholder="Search..." value={""} onChange={(e) => {}} className="w-32 sm:w-48 text-xs sm:text-sm" />
                <select className="h-8 sm:h-9 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" value={""} onChange={(e) => {}}>
                  <option value="all">All categories</option>
                  {Object.keys(CATEGORY_LABELS).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No credentials found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {items.map((vaultItem: any) => (
                    <div key={vaultItem.id} className="rounded-lg border border-border/60 bg-card/60 p-2 sm:p-3 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEdit(vaultItem)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">{vaultItem.label}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{vaultItem.username}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] shrink-0">{vaultItem.category}</Badge>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Added {new Date(vaultItem.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Security insight</CardTitle></CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{insight}</p></CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-70 sm:max-w-xl px-2 sm:px-5 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0"><DialogTitle className="text-start">{editingId ? "Edit credential" : "Add credential"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 max-h-full pr-1">
              <div className="space-y-4 pt-2 pb-2">
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">Label</Label>
                  <Input placeholder="e.g. Google, Chase Bank" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required className="text-xs sm:text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">Category</Label>
                  <select className="flex h-8 sm:h-9 w-full rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {Object.keys(CATEGORY_LABELS).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">Username / email</Label>
                  <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className="text-xs sm:text-sm" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] sm:text-xs">{editingId ? "New password (leave blank to keep current)" : "Password"}</Label>
                    <button type="button" className="text-[11px] text-primary hover:underline flex items-center gap-1" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}>
                      <RefreshCw className="h-3 w-3" /> Generate
                    </button>
                  </div>
                  <Input type="text" value={form.password} placeholder="••••••••" onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="text-xs sm:text-sm" />
                  {form.password && (
                    <div className="space-y-1 pt-1">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${formStrength.label === "strong" ? "bg-emerald-500" : formStrength.label === "medium" ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${formStrength.score}%` }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground capitalize">{formStrength.label} password</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">URL (optional)</Label>
                  <Input placeholder="https://..." value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} className="text-xs sm:text-sm" />
                  <Label>URL (optional)</Label>
                  <Input placeholder="https://..." value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Tags (comma separated)</Label>
                  <Input placeholder="Work, Personal" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Notes (optional)</Label>
                  <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.favorite} onChange={(e) => setForm((f) => ({ ...f, favorite: e.target.checked }))} className="rounded" />
                  <span className="text-sm">Mark as favorite</span>
                </label>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-3 border-t border-border mt-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>{createItem.isPending || updateItem.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}