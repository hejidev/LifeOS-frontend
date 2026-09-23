"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Plus, Minus, Trash2, Search, X, CreditCard,
  DollarSign, Smartphone, ArrowRight, Package, ScanLine, Camera, Monitor,
  ArrowLeft, Download, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBusinessProducts, useBusinessCustomers, useCreateSale, useLookupProductByBarcode, useBusinessProfile } from "@/lib/hooks/use-life-data";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { CameraBarcodeScanner } from "@/components/merchant/camera-barcode-scanner";
import { usePosDisplayBroadcast } from "@/lib/hooks/use-pos-display";
import { cn } from "@/lib/utils";
import { FaHandHolding } from "react-icons/fa6";
import Link from "next/link";

type CartItem = { productId: string; name: string; quantity: number; unitPrice: number };

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", icon: DollarSign },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "TRANSFER", label: "Transfer", icon: ArrowRight },
  { value: "MOBILE_MONEY", label: "Mobile", icon: Smartphone },
];

function buildReceiptText(sale: any, businessName: string, currency: string) {
  const line = (left: string, right: string) => {
    const width = 42;
    const gap = Math.max(1, width - left.length - right.length);
    return `${left}${" ".repeat(gap)}${right}`;
  };
  const rows = [
    businessName,
    `Receipt ${sale.receiptNumber}`,
    new Date(sale.createdAt).toLocaleString(),
    `Customer: ${sale.customerName ?? "Walk-in"}`,
    "-".repeat(42),
    ...sale.items.flatMap((it: any) => [
      it.name,
      line(`  ${it.quantity} x ${currency} ${it.unitPrice.toLocaleString()}`, `${currency} ${it.lineTotal.toLocaleString()}`),
    ]),
    "-".repeat(42),
    line("Subtotal", `${currency} ${sale.subtotal.toLocaleString()}`),
    line("Discount", `${currency} ${sale.discount.toLocaleString()}`),
    line("Total", `${currency} ${sale.total.toLocaleString()}`),
    "",
    `Payment: ${sale.paymentMethod.replace("_", " ")}`,
    "",
    "Thank you for your business!",
  ];
  return rows.join("\n");
}

function downloadReceipt(sale: any, businessName: string, currency: string) {
  const text = buildReceiptText(sale, businessName, currency);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${sale.receiptNumber}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function POSPage() {
  const { data: products = [] } = useBusinessProducts(true);
  const { data: customers = [] } = useBusinessCustomers();
  const { data: profile } = useBusinessProfile();
  const createSale = useCreateSale();
  const lookupBarcode = useLookupProductByBarcode();

  const businessName = (profile as any)?.businessName ?? "Your Store";
  const currency = (profile as any)?.currency ?? "NGN";

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [searchQuery, setSearchQuery] = useState("");
  const [discount, setDiscount] = useState(0);
  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [scanBarcodeInput, setScanBarcodeInput] = useState("");
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  const [displaySession] = useState(() => crypto.randomUUID());
  const [displayOpen, setDisplayOpen] = useState(false);
  const { publish } = usePosDisplayBroadcast(displaySession);

  const [receipt, setReceipt] = useState<any>(null);

  function addToCart(p: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.stock) return prev;
        return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      if (p.stock <= 0) return prev;
      return [...prev, { productId: p.id, name: p.name, unitPrice: p.price, quantity: 1 }];
    });
  }

  function handleBarcodeScan(code: string) {
    lookupBarcode.mutate(code, {
      onSuccess: (data: any) => {
        if (data.product.stock <= 0) {
          setScanFeedback({ type: "error", message: `${data.product.name} is out of stock` });
          setTimeout(() => setScanFeedback(null), 2200);
          return;
        }
        addToCart(data.product);
        setScanFeedback({ type: "success", message: `Added: ${data.product.name}` });
        setTimeout(() => setScanFeedback(null), 1800);
      },
      onError: () => {
        setScanFeedback({ type: "error", message: `No product found for barcode ${code}` });
        setTimeout(() => setScanFeedback(null), 2200);
      },
    });
    setScanBarcodeInput("");
  }

  useBarcodeScanner(handleBarcodeScan, true);

  function adjustQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const product = products.find((p: any) => p.id === productId);
          const max = product?.stock ?? Infinity;
          return { ...i, quantity: Math.min(max, i.quantity + delta) };
        })
        .filter((i) => i.quantity > 0)
    );
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

  const filteredProducts = searchQuery
    ? (products as any[]).filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : products;

  useEffect(() => {
    publish({
      businessName,
      currency,
      lines: cart.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
      discount,
      total,
      status: cart.length > 0 ? "shopping" : "idle",
    });
  }, [cart, discount, total, publish, businessName, currency]);

  const idleResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (idleResetTimeoutRef.current) clearTimeout(idleResetTimeoutRef.current);
    };
  }, []);

  function openCustomerDisplay() {
    window.open(
      `/merchant/pos/customer-display?session=${displaySession}`,
      "pos-customer-display",
      "width=1024,height=768"
    );
    setDisplayOpen(true);
  }

  function handleCheckout() {
    if (cart.length === 0) return;
    createSale.mutate(
      { customerId: customerId || undefined, items: cart, discount, paymentMethod, status: "PAID" },
      {
        onSuccess: (data: any) => {
          const sale = data?.sale ?? data;
          publish({
            businessName, currency,
            lines: cart.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
            discount, total, status: "paid",
          });
          
          idleResetTimeoutRef.current = setTimeout(() => {
            publish({ businessName, currency, lines: [], discount: 0, total: 0, status: "idle" });
          }, 4000);
          
          setReceipt(sale);
          setCart([]); setDiscount(0); setCustomerId("");
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-[#0B0F1A] text-white overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
          <Link
            href="/merchant/dashboard"
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <ShoppingCart className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="font-semibold text-lg">Point of Sale</span>
          <div className="flex-1" />
          {heldOrders.length > 0 && (
            <Badge variant="secondary" className="bg-amber-500/15 text-amber-300 border-0">
              {heldOrders.length} held
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={openCustomerDisplay}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 gap-2"
          >
            <Monitor className="h-3.5 w-3.5" />
            {displayOpen ? "Reopen display" : "Open customer display"}
          </Button>
        </div>

        <div className="px-6 py-4 space-y-3 border-b border-white/[0.06]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <Input
                placeholder="Scan barcode..."
                value={scanBarcodeInput}
                onChange={(e) => setScanBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && scanBarcodeInput.trim()) {
                    e.preventDefault();
                    handleBarcodeScan(scanBarcodeInput.trim());
                  }
                }}
                className="pl-11 h-12 text-base font-mono bg-white/5 border-white/10 text-white placeholder:text-white/25 focus-visible:ring-emerald-400/40"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0 border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => setCameraScannerOpen(true)}
            >
              <Camera className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/25"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!products || products.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-14 w-14 mx-auto text-white/10 mb-3" />
              <p className="text-white/40">No products available.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <Search className="h-14 w-14 mx-auto text-white/10 mb-3" />
              <p className="text-white/40">No products match "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {(filteredProducts as any[]).map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  className={cn(
                    "relative aspect-square rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 flex flex-col justify-between text-left overflow-hidden",
                    "hover:border-emerald-400/30 hover:bg-white/[0.06] active:scale-[0.96] transition-all duration-150",
                    "disabled:opacity-25 disabled:cursor-not-allowed"
                  )}
                >
                  {p.imageUrl && (
                    <>
                      <img src={p.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/50" />
                    </>
                  )}
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-base font-medium leading-tight line-clamp-2">{p.name}</p>
                    {p.stock <= p.lowStockAt && p.stock > 0 && (
                      <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-amber-400 mt-1" />
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-xl font-bold tabular-nums">{currency} {p.price.toLocaleString()}</p>
                    <p className={cn("text-xs font-mono mt-0.5", p.stock <= 0 ? "text-red-400" : p.stock <= p.lowStockAt ? "text-amber-400" : "text-white/30")}>
                      {p.stock > 0 ? `${p.stock} left` : "out of stock"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {heldOrders.length > 0 && (
          <div className="px-6 py-3 border-t border-white/[0.06] flex gap-2 overflow-x-auto">
            {heldOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => restoreOrder(order)}
                className="shrink-0 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 hover:bg-amber-400/10 transition-colors"
              >
                <FaHandHolding className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-mono text-amber-200">
                  {order.items.length} items · {currency} {order.items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-[420px] shrink-0 flex flex-col bg-[#0F1420] border-l border-white/[0.06]">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-sm text-white/50">Current sale</span>
          <span className="font-mono text-xs text-white/30">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/20 gap-2">
              <ShoppingCart className="h-8 w-8" />
              <p className="text-sm">Tap a product to begin</p>
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {cart.map((i) => (
                  <motion.div
                    key={i.productId}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="flex items-center gap-2 py-3 border-b border-white/[0.04]"
                  >
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => adjustQty(i.productId, -1)} className="h-7 w-7 rounded bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-mono text-sm">{i.quantity}</span>
                      <button onClick={() => adjustQty(i.productId, 1)} className="h-7 w-7 rounded bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="flex-1 min-w-0 truncate text-sm text-white/85">{i.name}</span>
                    <span className="font-mono text-sm tabular-nums">{(i.unitPrice * i.quantity).toLocaleString()}</span>
                    <button onClick={() => removeItem(i.productId)} className="text-white/20 hover:text-red-400 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/[0.06] space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setCustomerPickerOpen((v) => !v)}
              className="h-9 rounded-lg bg-white/[0.05] border border-white/10 text-xs px-3 flex items-center justify-between hover:bg-white/[0.08]"
            >
              <span className="truncate">{customers.find((c: any) => c.id === customerId)?.name ?? "Walk-in"}</span>
            </button>
            <div className="relative">
              <Input
                type="number"
                placeholder="Discount"
                value={discount || ""}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 text-xs font-mono bg-white/[0.05] border-white/10 text-white placeholder:text-white/25"
              />
            </div>
          </div>

          {customerPickerOpen && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] max-h-32 overflow-y-auto">
              <button onClick={() => { setCustomerId(""); setCustomerPickerOpen(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.06]">Walk-in</button>
              {(customers as any[]).map((c) => (
                <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerPickerOpen(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.06]">{c.name}</button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setPaymentMethod(m.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-2 border transition-colors",
                  paymentMethod === m.value ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]"
                )}
              >
                <m.icon className="h-3.5 w-3.5" />
                <span className="text-[9px]">{m.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 pt-1">
            {discount > 0 && (
              <div className="flex justify-between text-xs text-white/40">
                <span>Discount</span>
                <span className="font-mono">-{currency} {discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-end justify-between pt-1">
              <span className="text-sm text-white/50">Total</span>
              <span className="font-mono text-4xl font-bold tabular-nums">{currency} {total.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              onClick={holdOrder}
              disabled={cart.length === 0}
              className="h-12 border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <FaHandHolding className="h-4 w-4 mr-2" /> Hold
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0 || createSale.isPending}
              className="h-12 bg-emerald-500 hover:bg-emerald-400 text-[#0B0F1A] font-bold text-base"
            >
              {createSale.isPending ? "Processing..." : "Charge"}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {scanFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] text-sm px-4 py-2 rounded-full shadow-lg font-medium",
              scanFeedback.type === "success" ? "bg-emerald-500 text-[#0B0F1A]" : "bg-red-500 text-white"
            )}
          >
            {scanFeedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!receipt} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="max-w-sm bg-[#0F1420] border-white/10 text-white">
          <DialogHeader><DialogTitle className="text-white">Receipt</DialogTitle></DialogHeader>
          {receipt && (
            <>
              <div id="receipt-print-area" className="space-y-3 pt-1 text-sm font-mono">
                <div className="text-center space-y-0.5">
                  <p className="font-semibold text-base">{businessName}</p>
                  <p className="text-[11px] text-white/40">{receipt.receiptNumber}</p>
                  <p className="text-[11px] text-white/40">{new Date(receipt.createdAt).toLocaleString()}</p>
                  <p className="text-[11px] text-white/40">{receipt.customerName ?? "Walk-in customer"}</p>
                </div>
                <div className="border-t border-dashed border-white/10 pt-2 space-y-1.5">
                  {receipt.items.map((it: any) => (
                    <div key={it.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="truncate">{it.name}</p>
                        <p className="text-white/40">{it.quantity} × {currency} {it.unitPrice.toLocaleString()}</p>
                      </div>
                      <span className="shrink-0">{currency} {it.lineTotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-white/10 pt-2 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-white/60">
                    <span>Subtotal</span><span>{currency} {receipt.subtotal.toLocaleString()}</span>
                  </div>
                  {receipt.discount > 0 && (
                    <div className="flex items-center justify-between text-white/60">
                      <span>Discount</span><span>-{currency} {receipt.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-base font-bold pt-1">
                    <span>Total</span><span>{currency} {receipt.total.toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-white/10 pt-2 text-[11px] text-white/40">
                  <p className="capitalize">Payment: {receipt.paymentMethod.replace("_", " ").toLowerCase()}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => downloadReceipt(receipt, businessName, currency)}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
                <Button className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-[#0B0F1A] font-semibold" onClick={() => window.print()}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                </Button>
              </div>
              <Button variant="ghost" className="w-full text-white/50 hover:text-white hover:bg-white/5" onClick={() => setReceipt(null)}>
                New sale
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CameraBarcodeScanner
        open={cameraScannerOpen}
        onOpenChange={setCameraScannerOpen}
        onDetect={(code) => { setCameraScannerOpen(false); handleBarcodeScan(code); }}
      />

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; color: #000 !important; }
          #receipt-print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; background: #fff; }
        }
      `}</style>
    </div>
  );
}