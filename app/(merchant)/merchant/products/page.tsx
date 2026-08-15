"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Plus, Trash2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBusinessProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const emptyForm = { name: "", sku: "", category: "", price: "", cost: "", stock: "0", lowStockAt: "3", imageUrl: "" };

export default function ProductsPage() {
  const { data: products = [] } = useBusinessProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() { setEditingId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(p: any) {
    setEditingId(p.id);
    setForm({ name: p.name, sku: p.sku ?? "", category: p.category ?? "", price: String(p.price), cost: p.cost ? String(p.cost) : "", stock: String(p.stock), lowStockAt: String(p.lowStockAt), imageUrl: p.imageUrl ?? "" });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name, sku: form.sku || undefined, category: form.category || undefined,
      price: parseFloat(form.price), cost: form.cost ? parseFloat(form.cost) : undefined,
      stock: parseInt(form.stock) || 0, lowStockAt: parseInt(form.lowStockAt) || 3,
      imageUrl: form.imageUrl || undefined,
    };
    if (editingId) {
      updateProduct.mutate({ id: editingId, data: payload }, { onSuccess: () => setOpen(false) });
    } else {
      createProduct.mutate(payload, { onSuccess: () => setOpen(false) });
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Products</h1></div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add product</Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(products as any[]).map((p) => (
          <Card key={p.id}>
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku ?? "No SKU"} {p.category ? `· ${p.category}` : ""}</p>
                </div>
                {p.stock <= p.lowStockAt && <Badge variant="destructive" className="text-[10px]">Low stock</Badge>}
              </div>
              <p className="text-lg font-semibold">${p.price}</p>
              <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteProduct.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {products.length === 0 && <p className="text-sm text-muted-foreground col-span-3 text-center py-8">No products yet.</p>}
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingId ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Price</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Cost</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Low stock at</Label><Input type="number" value={form.lowStockAt} onChange={(e) => setForm((f) => ({ ...f, lowStockAt: e.target.value }))} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending}>{createProduct.isPending || updateProduct.isPending ? "Saving..." : "Save"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}