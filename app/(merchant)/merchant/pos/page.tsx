"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart, Plus, Minus, Trash2, Search, X, CreditCard,
  DollarSign, Smartphone, ArrowRight, Package, RotateCcw, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useBusinessProducts, useBusinessCustomers, useCreateSale } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";
import { FaHandHolding } from "react-icons/fa6";

type CartItem = { productId: string; name: string; quantity: number; unitPrice: number };

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const PAYMENT_ICONS = {
  CASH: DollarSign,
  CARD: CreditCard,
  TRANSFER: ArrowRight,
  MOBILE_MONEY: Smartphone,
};

export default function POSPage() {
  const { data: products = [] } = useBusinessProducts(true);
  const { data: customers = [] } = useBusinessCustomers();
  const createSale = useCreateSale();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [searchQuery, setSearchQuery] = useState("");
  const [discount, setDiscount] = useState(0);
  const [heldOrders, setHeldOrders] = useState<any[]>([]);

  function addToCart(p: any) {
    if (p.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId: p.id, name: p.name, quantity: 1, unitPrice: p.price }];
    });
  }

  function adjustQty(productId: string, delta: number) {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)).filter((i) => i.quantity > 0));
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  function holdOrder() {
    if (cart.length === 0) return;
    setHeldOrders([...heldOrders, { id: Date.now(), items: cart, customerId, paymentMethod, discount }]);
    setCart([]);
    setCustomerId("");
    setDiscount(0);
  }

  function restoreOrder(order: any) {
    setCart(order.items);
    setCustomerId(order.customerId);
    setPaymentMethod(order.paymentMethod);
    setDiscount(order.discount);
    setHeldOrders(heldOrders.filter((o) => o.id !== order.id));
  }

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const currency = "NGN";

  const filteredProducts = searchQuery
    ? (products as any[]).filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : products;

  function handleCheckout() {
    if (cart.length === 0) return;
    createSale.mutate(
      { customerId: customerId || undefined, items: cart, discount, paymentMethod, status: "PAID" },
      { onSuccess: () => { setCart([]); setDiscount(0); setCustomerId(""); } }
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <motion.div 
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20 shadow-sm"
          >
            <ShoppingCart className="h-5 w-5 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Point of Sale</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Fast checkout & order management</p>
          </div>
        </div>
        {heldOrders.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500 }}
          >
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{heldOrders.length} held order{heldOrders.length > 1 ? 's' : ''}</Badge>
          </motion.div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <motion.div variants={item} className="lg:col-span-2 space-y-4">
          <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                />
                {searchQuery && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 h-6 w-6 sm:h-7 sm:w-7 p-0"
                  >
                    <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                )}
              </div>

              {!products || products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No products available.</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No products match "{searchQuery}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {(filteredProducts as any[]).map((p, index) => (
                    <motion.button
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => addToCart(p)}
                      disabled={p.stock <= 0}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="group text-left rounded-xl border border-border bg-card p-3 sm:p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/0 group-hover:from-primary/5 group-hover:to-primary/5 transition-all duration-300" />
                      {p.stock <= p.lowStockAt && p.stock > 0 && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 z-10"
                        >
                          <Badge variant="warning" className="text-[9px] px-1.5 py-0 h-4">Low</Badge>
                        </motion.div>
                      )}
                      {p.stock <= 0 && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 z-10"
                        >
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">Out</Badge>
                        </motion.div>
                      )}
                      <div className="space-y-2 sm:space-y-3 relative z-10">
                        <div>
                          <p className="text-xs sm:text-sm font-semibold truncate group-hover:text-primary transition-colors">{p.name}</p>
                          {p.category && (
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 capitalize">{p.category}</p>
                          )}
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Price</p>
                            <motion.p 
                              className="text-sm sm:text-lg font-bold"
                              initial={{ y: 5, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              {currency} {p.price.toLocaleString()}
                            </motion.p>
                          </div>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <Badge
                              variant={p.stock <= 0 ? "destructive" : p.stock <= p.lowStockAt ? "warning" : "secondary"}
                              className="text-[10px] px-2 py-0.5"
                            >
                              {p.stock > 0 ? `${p.stock}` : "0"}
                            </Badge>
                          </motion.div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {heldOrders.length > 0 && (
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-2 text-amber-900">
                  <FaHandHolding className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Held Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {heldOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => restoreOrder(order)}
                    className="w-full flex items-center justify-between p-2 sm:p-3 rounded-lg bg-background/50 hover:bg-background transition-colors border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/20">
                        <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs sm:text-sm font-medium">{order.items.length} items</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{currency} {order.items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 sm:h-8 text-[10px] sm:text-xs border-amber-500/30 text-amber-700 hover:bg-amber-500/10">
                      Restore
                    </Button>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-all duration-300 hover:shadow-xl border-2 border-transparent hover:border-primary/30">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </motion.div>
                  Cart
                </CardTitle>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">{cart.length} item{cart.length !== 1 ? 's' : ''}</Badge>
                </motion.div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-muted-foreground/30 mb-2 sm:mb-3" />
                  <p className="text-xs sm:text-sm text-muted-foreground">Tap a product to add it here.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto pr-2">
                    {cart.map((i, index) => (
                      <motion.div 
                        key={i.productId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/20 transition-all duration-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">{i.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{currency} {i.unitPrice.toLocaleString()} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 sm:h-7 sm:w-7"
                              onClick={() => adjustQty(i.productId, -1)}
                            >
                              <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </Button>
                          </motion.div>
                          <motion.span 
                            key={i.quantity}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="w-5 sm:w-6 text-center text-xs sm:text-sm font-bold"
                          >
                            {i.quantity}
                          </motion.span>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 sm:h-7 sm:w-7"
                              onClick={() => adjustQty(i.productId, 1)}
                            >
                              <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </Button>
                          </motion.div>
                        </div>
                        <div className="text-right min-w-[50px] sm:min-w-[70px]">
                          <p className="text-xs sm:text-sm font-semibold">{currency} {(i.unitPrice * i.quantity).toLocaleString()}</p>
                        </div>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-7 sm:w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(i.productId)}
                          >
                            <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Button>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-[10px] sm:text-xs font-medium">Customer (optional)</Label>
                      <Select value={customerId} onValueChange={setCustomerId}>
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Walk-in customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {(customers as any[]).map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-[10px] sm:text-xs font-medium">Discount</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                            value={discount}
                            onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                            placeholder="0"
                          />
                          <span className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-muted-foreground">{currency}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-[10px] sm:text-xs font-medium">Payment</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PAYMENT_ICONS).map(([method, Icon]) => (
                              <SelectItem key={method} value={method}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {method.replace("_", " ")}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2 pt-2 sm:pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-medium text-emerald-600">-{currency} {discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1.5 sm:pt-2">
                      <span className="text-sm sm:text-base font-semibold">Total</span>
                      <span className="text-lg sm:text-xl font-bold">{currency} {total.toLocaleString()}</span>
                    </div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={holdOrder}
                        disabled={cart.length === 0}
                        className="h-9 sm:h-11 text-xs sm:text-sm"
                      >
                        <FaHandHolding className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Hold
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        className="h-9 sm:h-11 text-xs sm:text-sm font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                        disabled={cart.length === 0 || createSale.isPending}
                        onClick={handleCheckout}
                      >
                        {createSale.isPending ? (
                          <span className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </motion.div>
                            Processing...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </motion.div>
                            Complete
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}