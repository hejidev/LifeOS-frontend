"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Store, Plus, MapPin, Phone, Star, Pencil, Power } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Store as StoreType } from "@/lib/context/store-context";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function useStores() {
  return useQuery<StoreType[]>({ queryKey: ["stores"], queryFn: () => api.get("/stores").then((d) => d.stores) });
}
function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; address?: string; phone?: string }) => api.post("/stores", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
  });
}
function useUpdateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/stores/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
  });
}
function useSetDefaultStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/stores/${id}/set-default`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
  });
}

export default function LocationsPage() {
  const { data: stores = [] } = useStores();
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const setDefaultStore = useSetDefaultStore();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", address: "", phone: "" });
    setOpen(true);
  }

  function openEdit(s: StoreType) {
    setEditingId(s.id);
    setForm({ name: s.name, address: s.address ?? "", phone: s.phone ?? "" });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: form.name, address: form.address || undefined, phone: form.phone || undefined };
    if (editingId) {
      updateStore.mutate({ id: editingId, data: payload }, { onSuccess: () => setOpen(false) });
    } else {
      createStore.mutate(payload, { onSuccess: () => setOpen(false) });
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-linear-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Locations</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Manage every branch from one place</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((s) => (
          <Card key={s.id} className={s.isDefault ? "border-primary/40" : ""}>
            <CardContent className="p-5 space-y-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{s.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {s.isDefault && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Star className="h-2.5 w-2.5" /> Default
                    </Badge>
                  )}
                  {!s.active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {s.address && (
                  <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /> {s.address}</p>
                )}
                {s.phone && (
                  <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" /> {s.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(s)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                {!s.isDefault && (
                  <Button variant="outline" size="sm" onClick={() => setDefaultStore.mutate(s.id)}>
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!s.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={s.active ? "text-destructive hover:text-destructive" : "text-emerald-600 hover:text-emerald-600"}
                    onClick={() => updateStore.mutate({ id: s.id, data: { active: !s.active } })}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingId ? "Edit location" : "Add location"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Location name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ikeja Branch" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address (optional)</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone (optional)</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="080..." />
            </div>
            <Button type="submit" className="w-full" disabled={createStore.isPending || updateStore.isPending}>
              {editingId ? "Save changes" : "Add location"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}