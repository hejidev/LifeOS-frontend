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
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" /> Password Vault
          </h1>
          <p className="text-muted-foreground mt-1">Store logins securely — passwords are encrypted and never shown until you reveal them.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add credential</Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Vault items", value: stats.totalItems, icon: KeyRound },
          { label: "Weak", value: stats.weakCount, icon: ShieldCheck },
          { label: "Reused", value: stats.reusedCount, icon: Lock },
          { label: "Not updated 6mo+", value: stats.oldPasswords, icon: RefreshCw },
        ].map((s) => (
          <Card key={s.label} className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-xl font-semibold">{s.value}</p></CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Saved credentials</CardTitle>
              <Badge variant="secondary" className="text-[11px]">{items.length} items</Badge>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">Your vault is empty.</p>
                  <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-3 w-3" /> Add credential</Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[460px]">
                  <div className="space-y-2 pt-1">
                    {items.map((vaultItem: any) => {
                      const Icon = CATEGORY_ICONS[vaultItem.category] ?? Lock;
                      const isRevealed = Boolean(revealedPasswords[vaultItem.id]);
                      return (
                        <div key={vaultItem.id} className="rounded-lg border border-border/60 bg-card/60 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-sm font-medium truncate">{vaultItem.label}</p>
                                  {vaultItem.favorite && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {vaultItem.username || "No username"}{vaultItem.url ? ` · ${vaultItem.url}` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {strengthBadge(vaultItem.strengthLabel)}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(vaultItem)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteItem.mutate(vaultItem.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                          {vaultItem.hasPassword && (
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-muted/50 rounded px-2 py-1.5 truncate">
                                {isRevealed ? revealedPasswords[vaultItem.id] : "••••••••••••"}
                              </code>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => toggleReveal(vaultItem.id)}>
                                {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => copyPassword(vaultItem.id)}><Copy className="h-3.5 w-3.5" /></Button>
                              {copiedId === vaultItem.id && <span className="text-[10px] text-emerald-500">Copied</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
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
        <DialogContent className="max-w-sm max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0"><DialogTitle>{editingId ? "Edit credential" : "Add credential"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 max-h-[60vh] pr-3">
              <div className="space-y-4 pt-2 pb-2">
                <div className="space-y-1">
                  <Label>Label</Label>
                  <Input placeholder="e.g. Google, Chase Bank" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {Object.keys(CATEGORY_LABELS).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Username / email</Label>
                  <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>{editingId ? "New password (leave blank to keep current)" : "Password"}</Label>
                    <button type="button" className="text-[11px] text-primary hover:underline flex items-center gap-1" onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}>
                      <RefreshCw className="h-3 w-3" /> Generate
                    </button>
                  </div>
                  <Input type="text" value={form.password} placeholder="••••••••" onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
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