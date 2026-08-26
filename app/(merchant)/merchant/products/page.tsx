"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Plus, Trash2, Pencil, Search, AlertTriangle, RotateCcw, X, Tag, DollarSign, Box } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBusinessProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredProducts = searchQuery
    ? (products as any[]).filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())))
    : products;

  const currency = "NGN";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Manage your inventory</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 h-9 sm:h-10 text-sm">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </motion.div>

      <motion.div variants={item}>
        <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Product Catalog</CardTitle>
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
                placeholder="Search products by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
              />
            </div>

            {!products || products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No products yet.</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" /> Add your first product
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No products match "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {(filteredProducts as any[]).map((p) => (
                  <Card key={p.id} className="group hover:border-primary/40 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      <div className="flex items-start justify-between mb-2 sm:mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate">{p.name}</p>
                          {p.category && (
                            <p className="text-[9px] sm:text-xs text-muted-foreground capitalize mt-0.5">{p.category}</p>
                          )}
                          {p.sku && (
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">SKU: {p.sku}</p>
                          )}
                        </div>
                        {p.stock <= p.lowStockAt && p.stock > 0 && (
                          <Badge variant="warning" className="text-[9px] px-1.5 py-0 h-4 shrink-0">Low</Badge>
                        )}
                        {p.stock <= 0 && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 shrink-0">Out</Badge>
                        )}
                      </div>
                      <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">Price</span>
                          <span className="text-xs sm:text-sm font-semibold">{currency} {p.price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">Stock</span>
                          <span className={cn("text-xs sm:text-sm font-medium", p.stock <= 0 ? "text-destructive" : p.stock <= p.lowStockAt ? "text-amber-600" : "")}>
                            {p.stock}
                          </span>
                        </div>
                        {p.cost && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Cost</span>
                            <span className="text-xs sm:text-sm font-medium">{currency} {p.cost.toLocaleString()}</span>
                            <span className="text-xs font-medium">{currency} {p.cost.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-2 sm:pt-3 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 sm:h-8 text-[10px] sm:text-xs"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Remove "${p.name}" from your catalog?`)) {
                              deleteProduct.mutate(p.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pt-2">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Product Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enter product name" required className="h-9 sm:h-10 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">SKU (optional)</Label>
                <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="SKU-001" className="h-9 sm:h-10 text-sm" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Category</Label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Electronics" className="h-9 sm:h-10 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Selling Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="pl-9 h-9 sm:h-10 text-sm" placeholder="0.00" required />
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Cost Price (optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} className="pl-9 h-9 sm:h-10 text-sm" placeholder="0.00" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Initial Stock</Label>
                <div className="relative">
                  <Box className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="pl-9 h-9 sm:h-10 text-sm" placeholder="0" />
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Low Stock Alert</Label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" value={form.lowStockAt} onChange={(e) => setForm((f) => ({ ...f, lowStockAt: e.target.value }))} className="pl-9 h-9 sm:h-10 text-sm" placeholder="3" />
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full h-9 sm:h-11 text-sm" disabled={createProduct.isPending || updateProduct.isPending}>
              {createProduct.isPending || updateProduct.isPending ? (
                <span className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                editingId ? "Update Product" : "Add Product"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}