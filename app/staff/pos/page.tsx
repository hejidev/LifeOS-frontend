"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, LogOut, Sparkles, Users, RotateCcw, MessageSquare, UserCircle2,
  Plus, Minus, Trash2, ShoppingCart, X, Store, Receipt, Download, Printer,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { staffApi, StaffSessionExpiredError } from "@/lib/api/staff-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

const QUICK_ACTIONS = [
  { action: "CUSTOMER_ADDED", label: "Helped a customer", icon: Users, color: "text-sky-500 bg-sky-500/10" },
  { action: "REFUND_ISSUED", label: "Processed a return", icon: RotateCcw, color: "text-amber-500 bg-amber-500/10" },
  { action: "OTHER", label: "Note", icon: MessageSquare, color: "text-violet-500 bg-violet-500/10" },
];

type CartItem = { productId: string; name: string; unitPrice: number; quantity: number };

function useElapsedTime(since: Date | null) {
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (!since) return;
    const tick = () => {
      const diff = Date.now() - since.getTime();
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  return elapsed;
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function buildReceiptText(sale: any, businessName: string, currency: string, staffName: string) {
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
    line("Total", `${currency} ${sale.total.toLocaleString()}`),
    "",
    `Payment: ${sale.paymentMethod.replace("_", " ")}`,
    `Served by: ${staffName}`,
    "",
    "Thank you for your business!",
  ];
  return rows.join("\n");
}

function downloadReceipt(sale: any, businessName: string, currency: string, staffName: string) {
  const text = buildReceiptText(sale, businessName, currency, staffName);
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

export default function StaffShiftPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [shiftStart] = useState(new Date());
  const [activity, setActivity] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [clockOutConfirm, setClockOutConfirm] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  const [saleOpen, setSaleOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [checkingOut, setCheckingOut] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const elapsed = useElapsedTime(shiftStart);
  const clock = useClock();

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const data = await staffApi.get("/staff-portal/activity");
      setActivity(data.activity);
    } catch {}
  }, []);

  const loadTeam = useCallback(async () => {
    try {
      const data = await staffApi.get("/staff-portal/team");
      setTeam(data.team);
    } catch {}
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/staff-session/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setStaff(d.staff);
        setBusinessName(d.businessName ?? "");
        setCurrency(d.currency ?? "USD");
      })
      .catch(() => router.push("/staff/login"));
    loadActivity();
    loadTeam();
  }, [router, loadActivity, loadTeam]);

  async function openSale() {
    setSaleOpen(true);
    try {
      const [p, c] = await Promise.all([
        staffApi.get("/staff-pos/products"),
        staffApi.get("/staff-pos/customers"),
      ]);
      setProducts(p.products);
      setCustomers(c.customers);
    } catch (err) {
      if (!(err instanceof StaffSessionExpiredError)) showToast("error", (err as Error).message);
    }
  }

  function addToCart(p: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId: p.id, name: p.name, unitPrice: p.price, quantity: 1 }];
    });
  }
  function cartQtyFor(productId: string) {
    return cart.find((i) => i.productId === productId)?.quantity ?? 0;
  }
  function adjustQty(productId: string, delta: number) {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0));
  }
  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setCheckingOut(true);
    try {
      const { sale } = await staffApi.post("/staff-pos/sales", {
        customerId: customerId || undefined,
        items: cart.map(({ productId, name, unitPrice, quantity }) => ({ productId, name, unitPrice, quantity })),
        paymentMethod,
        status: "PAID",
      });
      setCart([]);
      setCustomerId("");
      setSaleOpen(false);
      setReceipt(sale);
      loadActivity();
    } catch (err) {
      if (!(err instanceof StaffSessionExpiredError)) showToast("error", (err as Error).message);
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleQuickAction(action: string, label: string) {
    if (action === "OTHER") { setNoteOpen(true); return; }
    try {
      await staffApi.post("/staff-portal/activity", { action, description: label });
      showToast("success", `Logged: ${label}`);
      loadActivity();
    } catch (err) {
      if (err instanceof StaffSessionExpiredError) return;
      showToast("error", (err as Error).message);
    }
  }

  async function handleNoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await staffApi.post("/staff-portal/activity", { action: "OTHER", description: note });
      setNote("");
      setNoteOpen(false);
      showToast("success", "Note logged");
      loadActivity();
    } catch (err) {
      if (err instanceof StaffSessionExpiredError) return;
      showToast("error", (err as Error).message);
    }
  }

  async function handleConfirmClockOut() {
    setClockingOut(true);
    try {
      await staffApi.post("/staff-portal/clock-out");
      await fetch(`${API_URL}/staff-session/logout`, { method: "POST", credentials: "include" });
      router.push("/staff/login");
    } catch (err) {
      if (!(err instanceof StaffSessionExpiredError)) {
        showToast("error", "Couldn't clock out — try again");
      }
    } finally {
      setClockingOut(false);
    }
  }

  if (!staff) return null;

  const todayCount = activity.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:py-8">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative max-w-lg mx-auto space-y-4 sm:space-y-5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-1.5">
          <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 mb-1">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-pulse ring-2 ring-background" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">You're on shift, {staff.name}</h1>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Store className="h-3 w-3" /> {businessName} · {staff.role.replace("_", " ")} · {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </motion.div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5 sm:pt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Shift duration</p>
                <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums">{elapsed}</p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setClockOutConfirm(true)} className="shrink-0">
              <LogOut className="mr-1 h-3.5 w-3.5" /> Clock out
            </Button>
          </CardContent>
        </Card>

        <button
          onClick={openSale}
          className="w-full h-16 rounded-2xl gradient-bg text-white font-semibold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <ShoppingCart className="h-5 w-5" /> New Sale
        </button>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{todayCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Actions logged</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{team.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Teammates active</p>
            </CardContent>
          </Card>
        </div>

        {team.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><UserCircle2 className="h-3.5 w-3.5" /> On shift with you</p>
              <div className="flex flex-wrap gap-2">
                {team.map((t) => (
                  <div key={t.id} className="flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.role.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Quick log</p>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.action}
                onClick={() => handleQuickAction(qa.action, qa.label)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-4 hover:border-primary/40 hover:bg-card transition-colors"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${qa.color}`}><qa.icon className="h-4 w-4" /></div>
                <span className="text-xs font-medium text-center leading-tight">{qa.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="pt-4 sm:pt-6 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Today's activity</p>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nothing logged yet — ring up a sale or use the quick actions above.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2 gap-2">
                    <span className="truncate">{a.description}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={saleOpen} onOpenChange={setSaleOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> New Sale</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              {products.map((p) => {
                const inCart = cartQtyFor(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    className="relative text-left rounded-xl border border-border/60 bg-card/60 p-3 hover:border-primary/40 hover:bg-card transition-colors disabled:opacity-40"
                  >
                    {inCart > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full gradient-bg text-white text-[10px] font-bold flex items-center justify-center">{inCart}</span>
                    )}
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{currency} {p.price}</p>
                    <p className={`text-[10px] mt-0.5 ${p.stock <= p.lowStockAt ? "text-amber-500" : "text-muted-foreground"}`}>{p.stock} left</p>
                  </button>
                );
              })}
              {products.length === 0 && <p className="col-span-2 text-sm text-muted-foreground text-center py-4">No products available.</p>}
            </div>

            {cart.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                {cart.map((i) => (
                  <div key={i.productId} className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate flex-1">{i.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => adjustQty(i.productId, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-5 text-center text-xs">{i.quantity}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => adjustQty(i.productId, 1)}><Plus className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeItem(i.productId)}><X className="h-3 w-3" /></Button>
                    </div>
                    <span className="w-16 text-right text-xs shrink-0">{currency} {(i.unitPrice * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {["CASH", "CARD", "TRANSFER", "MOBILE_MONEY"].map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-border shrink-0 space-y-2">
            <p className="text-lg font-bold text-right">Total: {currency} {total.toFixed(2)}</p>
            <Button className="w-full" onClick={handleCheckout} disabled={cart.length === 0 || checkingOut}>
              {checkingOut ? "Processing..." : "Complete sale"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Receipt</DialogTitle></DialogHeader>
          {receipt && (
            <>
              <div id="receipt-print-area" className="space-y-3 pt-1 text-sm">
                <div className="text-center space-y-0.5">
                  <p className="font-semibold">{businessName}</p>
                  <p className="text-[11px] text-muted-foreground">{receipt.receiptNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(receipt.createdAt).toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">{receipt.customerName ?? "Walk-in customer"}</p>
                </div>
                <div className="border-t border-dashed border-border pt-2 space-y-1.5">
                  {receipt.items.map((it: any) => (
                    <div key={it.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="truncate">{it.name}</p>
                        <p className="text-muted-foreground">{it.quantity} × {currency} {it.unitPrice.toLocaleString()}</p>
                      </div>
                      <span className="shrink-0 font-medium">{currency} {it.lineTotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-border pt-2 flex items-center justify-between text-sm font-semibold">
                  <span>Total</span><span>{currency} {receipt.total.toLocaleString()}</span>
                </div>
                <div className="border-t border-dashed border-border pt-2 text-[11px] text-muted-foreground space-y-0.5">
                  <p className="capitalize">Payment: {receipt.paymentMethod.replace("_", " ").toLowerCase()}</p>
                  <p>Served by: {staff.name}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => downloadReceipt(receipt, businessName, currency, staff.name)}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
                <Button className="flex-1" onClick={() => window.print()}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add a note</DialogTitle></DialogHeader>
          <form onSubmit={handleNoteSubmit} className="space-y-3 pt-2">
            <Textarea rows={3} placeholder="What happened?" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
            <Button type="submit" className="w-full">Log note</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={clockOutConfirm} onOpenChange={setClockOutConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>End your shift?</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-muted/30 p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-mono font-semibold">{elapsed}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Actions logged</span><span className="font-semibold">{todayCount}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setClockOutConfirm(false)}>Stay clocked in</Button>
              <Button variant="destructive" className="flex-1" onClick={handleConfirmClockOut} disabled={clockingOut}>
                {clockingOut ? "Clocking out..." : "Clock out"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm px-4 py-2 rounded-full shadow-lg ${toast.type === "success" ? "bg-emerald-500" : "bg-destructive"}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; }
        }
      `}</style>
    </div>
  );
}