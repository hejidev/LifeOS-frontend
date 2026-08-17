"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusinessProducts, useBusinessCustomers, useCreateSale } from "@/lib/hooks/use-life-data";

type CartItem = { productId: string; name: string; quantity: number; unitPrice: number };

export default function POSPage() {
  const { data: products = [] } = useBusinessProducts(true);
  const { data: customers = [] } = useBusinessCustomers();
  const createSale = useCreateSale();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [searchQuery, setSearchQuery] = useState("");

  function addToCart(p: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId: p.id, name: p.name, quantity: 1, unitPrice: p.price }];
    });
  }
  function adjustQty(productId: string, delta: number) {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)).filter((i) => i.quantity > 0));
  }
  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const filteredProducts = searchQuery
    ? (products as any[]).filter((p) => p.name.toLowerCase() === searchQuery.toLowerCase())
    : products;

  function handleCheckout() {
    if (cart.length === 0) return;
    createSale.mutate(
      { customerId: customerId || undefined, items: cart, paymentMethod, status: "PAID" },
      { onSuccess: () => setCart([]) }
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> Point of Sale</h1>
        <input
          type="text"
          placeholder="Search products (exact match)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(filteredProducts as any[]).map((p) => (
            <button key={p.id} onClick={() => addToCart(p)} className="text-left rounded-lg border border-border/60 bg-card/60 p-3 hover:border-primary/40 transition-colors">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground">${p.price} · {p.stock} in stock</p>
            </button>
          ))}
          {filteredProducts.length === 0 && searchQuery && (
            <p className="text-sm text-muted-foreground col-span-2 md:col-span-3 text-center py-4">No exact match found for "{searchQuery}"</p>
          )}
        </div>
      </div>

      <Card className="h-fit sticky top-4">
        <CardContent className="pt-6 space-y-3">
          <p className="font-semibold">Cart</p>
          {cart.length === 0 ? <p className="text-sm text-muted-foreground">No items yet.</p> : (
            <div className="space-y-2">
              {cart.map((i) => (
                <div key={i.productId} className="flex items-center justify-between text-sm">
                  <div className="min-w-0"><p className="truncate">{i.name}</p><p className="text-xs text-muted-foreground">${i.unitPrice} × {i.quantity}</p></div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => adjustQty(i.productId, -1)}><Minus className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => adjustQty(i.productId, 1)}><Plus className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeItem(i.productId)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in customer</option>
            {(customers as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {["CASH", "CARD", "TRANSFER", "MOBILE_MONEY"].map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
          </select>
          <p className="text-lg font-bold">Total: ${total.toFixed(2)}</p>
          <Button className="w-full" onClick={handleCheckout} disabled={cart.length === 0 || createSale.isPending}>{createSale.isPending ? "Processing..." : "Complete sale"}</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}