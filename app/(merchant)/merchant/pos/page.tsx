"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowLeftRight, Banknote, Camera, ChevronRight, Clock, CreditCard, Download, Loader2, Minus, Monitor, Package,
  Pause, Plus, Printer, ScanLine, Search, ShoppingCart, Smartphone, Trash2, UserPlus, Users, X, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CameraBarcodeScanner } from "@/components/merchant/camera-barcode-scanner";
import { money } from "@/components/merchant/ops-ui";
import { PrintArea } from "@/components/pos/print-area";
import { useStoreContext } from "@/lib/context/store-context";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { useBusinessCustomers, useBusinessProducts, useBusinessProfile, useCreateCustomer, useCreateSale, useLookupProductByBarcode } from "@/lib/hooks/use-life-data";
import { useCollectPayment, useRefreshOps } from "@/lib/hooks/use-merchant-ops";
import { usePosDisplayBroadcast } from "@/lib/hooks/use-pos-display";
import { cn } from "@/lib/utils";

type Method = "CASH" | "CARD" | "TRANSFER" | "MOBILE_MONEY" | "LATER";

interface Product { id: string; name: string; price: number; stock: number; lowStockAt: number; imageUrl?: string; barcode?: string; sku?: string; category?: string }
interface Customer { id: string; name: string; phone?: string; loyaltyPoints?: number; balance?: number }
interface Line { productId: string; name: string; unitPrice: number; quantity: number }
interface Held { id: number; lines: Line[]; customerId: string; discount: number }
interface ReceiptState { sale: any; cashReceived?: number; warning?: string }

const METHODS: { value: Method; label: string; icon: LucideIcon }[] = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "TRANSFER", label: "Transfer", icon: ArrowLeftRight },
  { value: "MOBILE_MONEY", label: "Mobile", icon: Smartphone },
  { value: "LATER", label: "Pay later", icon: Clock },
];

const DEPOSIT_METHODS = METHODS.filter((item) => item.value !== "LATER");
const METHOD_NAMES: Record<string, string> = { CASH: "Cash", CARD: "Card", TRANSFER: "Transfer", MOBILE_MONEY: "Mobile money" };

const field = "border-white/10 bg-white/[0.05] text-white placeholder:text-white/30 focus-visible:ring-emerald-400/40";

function receiptText(sale: any, business: string, currency: string, cashReceived?: number) {
  const width = 42;
  const row = (left: string, right: string) => `${left}${" ".repeat(Math.max(1, width - left.length - right.length))}${right}`;
  const fmt = (value: number) => `${currency} ${Number(value).toLocaleString()}`;
  const unpaid = sale.status === "PENDING";

  return [
    business,
    `Receipt ${sale.receiptNumber}`,
    new Date(sale.createdAt).toLocaleString(),
    `Customer: ${sale.customerName ?? "Walk-in"}`,
    "-".repeat(width),
    ...sale.items.flatMap((item: any) => [item.name, row(`  ${item.quantity} x ${fmt(item.unitPrice)}`, fmt(item.lineTotal))]),
    "-".repeat(width),
    ...(sale.discount > 0 ? [row("Subtotal", fmt(sale.subtotal)), row("Discount", `-${fmt(sale.discount)}`)] : []),
    row("Total", fmt(sale.total)),
    "",
    ...(unpaid
      ? [row("Paid so far", fmt(sale.amountPaid ?? 0)), row("Balance due", fmt(sale.balance ?? sale.total)), "Status: UNPAID"]
      : [`Payment: ${METHOD_NAMES[sale.paymentMethod] ?? sale.paymentMethod}`]),
    ...(!unpaid && cashReceived !== undefined ? [row("Cash received", fmt(cashReceived)), row("Change", fmt(Math.max(0, cashReceived - sale.total)))] : []),
    "",
    "Thank you for your business!",
  ].join("\n");
}

function saveReceipt(text: string, number: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `receipt-${number}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function CustomerDialog({ open, onOpenChange, customers, selectedId, currency, onSelect }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  selectedId: string;
  currency: string;
  onSelect: (customer: Customer | null) => void;
}) {
  const create = useCreateCustomer();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setAdding(false);
      setError(null);
    }
  }, [open]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((item) => !needle || item.name.toLowerCase().includes(needle) || (item.phone ?? "").includes(needle)).slice(0, 60);
  }, [customers, query]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const phone = form.phone.trim();
    try {
      const result = await create.mutateAsync({ name: form.name.trim(), ...(phone ? { phone } : {}) });
      setForm({ name: "", phone: "" });
      setAdding(false);
      onSelect((result?.customer ?? result) as Customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the customer.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 overflow-hidden border-white/10 bg-[#0F1420] p-0 text-white">
        <DialogHeader className="border-b border-white/[0.06] p-4"><DialogTitle>Customer</DialogTitle></DialogHeader>
        <div className="space-y-3 border-b border-white/[0.06] p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or phone" className={cn("h-10 pl-9", field)} />
          </div>
          {adding ? (
            <form onSubmit={add} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" className={cn("h-10", field)} required autoFocus />
              <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone (optional)" inputMode="tel" className={cn("h-10", field)} />
              {error ? <p className="text-xs text-red-400">{error}</p> : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setAdding(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending || !form.name.trim()} className="flex-1 bg-emerald-500 text-[#0B0F1A] hover:bg-emerald-400">{create.isPending ? "Adding..." : "Add and select"}</Button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-2.5 text-sm text-white/70 hover:bg-white/[0.04]">
              <UserPlus className="h-4 w-4" /> New customer
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <button type="button" onClick={() => onSelect(null)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/[0.06]", !selectedId && "bg-white/[0.06]")}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08]"><Users className="h-4 w-4 text-white/60" /></span>
            Walk-in customer
          </button>
          {shown.map((item) => (
            <button key={item.id} type="button" onClick={() => onSelect(item)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.06]", selectedId === item.id && "bg-white/[0.06]")}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-300">{item.name.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="block truncate text-[11px] text-white/40">
                  {[item.phone, item.loyaltyPoints ? `${item.loyaltyPoints} pts` : null].filter(Boolean).join(" · ") || "No contact on file"}
                </span>
              </span>
              {item.balance && item.balance > 0 ? <span className="shrink-0 text-[11px] font-medium text-amber-300">owes {money(currency, item.balance)}</span> : null}
            </button>
          ))}
          {shown.length === 0 ? <p className="py-8 text-center text-sm text-white/40">No customers match.</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function POSPage() {
  const { currentStore } = useStoreContext();
  const { data: productData = [] } = useBusinessProducts(true);
  const { data: customerData = [] } = useBusinessCustomers();
  const { data: profile } = useBusinessProfile();
  const createSale = useCreateSale();
  const collect = useCollectPayment();
  const lookup = useLookupProductByBarcode();
  const refreshOps = useRefreshOps();

  const products = productData as Product[];
  const customers = customerData as Customer[];
  const settings = profile as any;
  const businessName: string = settings?.businessName ?? "Your store";
  const currency: string = settings?.currency ?? "NGN";
  const pointValue = Number(settings?.loyaltyRedemptionValue ?? 0);
  const loyaltyOn = !!settings?.loyaltyEnabled && pointValue > 0;

  const [cart, setCart] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [pickedCustomer, setPickedCustomer] = useState<Customer | null>(null);
  const [method, setMethod] = useState<Method>("CASH");
  const [discount, setDiscount] = useState(0);
  const [cashReceived, setCashReceived] = useState("");
  const [deposit, setDeposit] = useState("");
  const [depositMethod, setDepositMethod] = useState<string>("CASH");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [scanInput, setScanInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [held, setHeld] = useState<Held[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cartRef = useRef<Line[]>([]);
  const attemptRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [displaySession] = useState(() => crypto.randomUUID());
  const { publish } = usePosDisplayBroadcast(displaySession);

  const commit = useCallback((next: Line[]) => {
    cartRef.current = next;
    setCart(next);
  }, []);

  const flash = useCallback((type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFeedback(null), 2200);
  }, []);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    },
    []
  );

  const customer = customers.find((item) => item.id === customerId) ?? (pickedCustomer?.id === customerId ? pickedCustomer : null);
  const later = method === "LATER";
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const afterManual = Math.max(0, subtotal - discount);
  const maxRedeem = loyaltyOn && customer && !later ? Math.min(customer.loyaltyPoints ?? 0, Math.ceil(afterManual / pointValue)) : 0;
  const redeem = Math.min(redeemPoints, maxRedeem);
  const totalDiscount = Math.min(subtotal, discount + redeem * pointValue);
  const total = Math.max(0, subtotal - totalDiscount);

  const cashNumber = cashReceived.trim() === "" ? total : Number(cashReceived);
  const cashShort = method === "CASH" && (!Number.isFinite(cashNumber) || cashNumber < total);
  const depositNumber = later ? Number(deposit) || 0 : 0;
  const depositBad = later && depositNumber > 0 && depositNumber >= total;
  const quickCash = useMemo(() => {
    const values = [total, ...[100, 500, 1000, 5000].map((step) => Math.ceil(total / step) * step)];
    return [...new Set(values)].filter((value) => value > 0 && value >= total).slice(0, 4);
  }, [total]);

  const hint = later && !customerId
    ? "Choose a customer to sell on credit."
    : later && total <= 0
      ? "There's nothing to collect later."
      : depositBad
        ? "The deposit must be less than the total."
        : cashShort
          ? `Cash received is short by ${money(currency, Math.max(0, total - (Number.isFinite(cashNumber) ? cashNumber : 0)))}.`
          : null;
  const canCharge = cart.length > 0 && !submitting && !hint;

  const categories = useMemo(() => [...new Set(products.map((item) => item.category).filter(Boolean) as string[])].sort(), [products]);
  const activeCategory = categories.includes(category) ? category : "all";
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) return false;
      return !needle || item.name.toLowerCase().includes(needle) || (item.sku ?? "").toLowerCase().includes(needle) || (item.barcode ?? "").toLowerCase().includes(needle);
    });
  }, [products, query, activeCategory]);
  const quantities = useMemo(() => new Map(cart.map((line) => [line.productId, line.quantity])), [cart]);

  useEffect(() => {
    publish({
      businessName,
      currency,
      lines: cart.map((line) => ({ name: line.name, quantity: line.quantity, unitPrice: line.unitPrice })),
      discount: totalDiscount,
      total,
      status: cart.length > 0 ? "shopping" : "idle",
    });
  }, [cart, totalDiscount, total, publish, businessName, currency]);

  function addProduct(product: Product): "added" | "maxed" | "out" {
    if (product.stock <= 0) return "out";
    const current = cartRef.current;
    const existing = current.find((line) => line.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return "maxed";
      commit(current.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1, unitPrice: product.price } : line)));
      return "added";
    }
    commit([...current, { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1 }]);
    return "added";
  }

  function handleAdd(product: Product) {
    const result = addProduct(product);
    if (result === "maxed") flash("error", `Only ${product.stock} of ${product.name} in stock`);
    if (result === "out") flash("error", `${product.name} is out of stock`);
  }

  function adjust(productId: string, delta: number) {
    const stock = products.find((item) => item.id === productId)?.stock ?? Infinity;
    commit(
      cartRef.current.flatMap((line): Line[] => {
        if (line.productId !== productId) return [line];
        const quantity = Math.min(stock, line.quantity + delta);
        return quantity <= 0 ? [] : [{ ...line, quantity }];
      })
    );
  }

  const scan = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      setScanInput("");
      let product = products.find((item) => item.barcode === code || item.sku === code);
      if (!product) {
        try {
          product = (await lookup.mutateAsync(code))?.product as Product | undefined;
        } catch {
          product = undefined;
        }
      }
      if (!product) return flash("error", `No product found for ${code}`);
      const result = addProduct(product);
      if (result === "added") flash("success", `Added ${product.name}`);
      else flash("error", result === "maxed" ? `Only ${product.stock} of ${product.name} in stock` : `${product.name} is out of stock`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, lookup, flash]
  );

  useBarcodeScanner(scan, !receipt && !customerOpen && !cameraOpen);

  function resetSale() {
    commit([]);
    setCustomerId("");
    setPickedCustomer(null);
    setDiscount(0);
    setCashReceived("");
    setDeposit("");
    setRedeemPoints(0);
    setMethod("CASH");
    setError(null);
    attemptRef.current = null;
  }

  function holdOrder() {
    if (cart.length === 0) return;
    setHeld((current) => [...current, { id: Date.now(), lines: cart, customerId, discount }]);
    resetSale();
    setCartOpen(false);
  }

  function resume(order: Held) {
    const rest = held.filter((item) => item.id !== order.id);
    setHeld(cart.length > 0 ? [...rest, { id: Date.now(), lines: cart, customerId, discount }] : rest);
    commit(order.lines);
    setCustomerId(order.customerId);
    setPickedCustomer(null);
    setDiscount(order.discount);
    setRedeemPoints(0);
    setCartOpen(true);
  }

  function selectCustomer(next: Customer | null) {
    setCustomerId(next?.id ?? "");
    setPickedCustomer(next);
    setRedeemPoints(0);
    setCustomerOpen(false);
  }

  async function checkout() {
    if (!canCharge) return;
    setSubmitting(true);
    setError(null);

    const fingerprint = JSON.stringify([cart.map((line) => [line.productId, line.quantity, line.unitPrice]), customerId, method, discount, redeem]);
    const attempt = attemptRef.current?.fingerprint === fingerprint ? attemptRef.current : { fingerprint, id: crypto.randomUUID() };
    attemptRef.current = attempt;

    const lines = cart;
    try {
      const created = await createSale.mutateAsync({
        clientRequestId: attempt.id,
        customerId: customerId || undefined,
        items: lines.map(({ productId, name, unitPrice, quantity }) => ({ productId, name, unitPrice, quantity })),
        discount,
        paymentMethod: later ? "CASH" : method,
        status: later ? "PENDING" : "PAID",
        redeemPoints: redeem > 0 ? redeem : undefined,
      });

      let sale = created?.sale ?? created;
      let warning: string | undefined;

      if (later && depositNumber > 0) {
        try {
          await collect.mutateAsync({ saleId: sale.id, paymentMethod: depositMethod, amount: depositNumber });
          sale = { ...sale, amountPaid: depositNumber, balance: Math.max(0, sale.total - depositNumber) };
        } catch (err) {
          warning = `The sale is saved as unpaid, but the deposit wasn't recorded (${err instanceof Error ? err.message : "unknown error"}). Record it from the Sales page.`;
        }
      }

      publish({ businessName, currency, lines: lines.map((line) => ({ name: line.name, quantity: line.quantity, unitPrice: line.unitPrice })), discount: sale.discount, total: sale.total, status: later ? "idle" : "paid" });
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => publish({ businessName, currency, lines: [], discount: 0, total: 0, status: "idle" }), 4000);

      setReceipt({ sale, warning, cashReceived: method === "CASH" && cashReceived.trim() !== "" ? Number(cashReceived) : undefined });
      resetSale();
      setCartOpen(false);
      refreshOps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't complete the sale.");
    } finally {
      setSubmitting(false);
    }
  }

  function openDisplay() {
    window.open(`/merchant/pos/customer-display?session=${displaySession}`, "pos-customer-display", "width=1024,height=768");
    setDisplayOpen(true);
  }

  const customerNote = customer
    ? [customer.loyaltyPoints ? `${customer.loyaltyPoints} pts` : null, customer.balance && customer.balance > 0 ? `owes ${money(currency, customer.balance)}` : null].filter(Boolean).join(" · ") || customer.phone || "Tap to change"
    : "Tap to choose or add a customer";

  return (
    <div className="fixed inset-0 z-40 flex h-dvh flex-col overflow-hidden bg-[#0B0F1A] text-white lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
          <Link href="/merchant/dashboard" className="flex shrink-0 items-center gap-1.5 text-sm text-white/50 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="hidden h-4 w-px bg-white/10 sm:block" />
          <ShoppingCart className="hidden h-5 w-5 shrink-0 text-emerald-400 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold sm:text-base">Point of sale</p>
            {currentStore?.name ? <p className="truncate text-[11px] text-white/40">{currentStore.name}</p> : null}
          </div>
          <Button variant="outline" size="sm" onClick={openDisplay} className="shrink-0 gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10">
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{displayOpen ? "Reopen display" : "Customer display"}</span>
          </Button>
        </header>

        <div className="space-y-3 border-b border-white/[0.06] px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
              <Input
                value={scanInput}
                onChange={(event) => setScanInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && scanInput.trim()) {
                    event.preventDefault();
                    void scan(scanInput);
                  }
                }}
                placeholder="Scan or type a barcode"
                className={cn("h-11 pl-11 font-mono", field)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 border-white/10 bg-white/5 hover:bg-white/10" aria-label="Scan with camera" onClick={() => setCameraOpen(true)}>
              <Camera className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className={cn("h-10 pl-10", field)} />
            {query ? (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X className="h-4 w-4" /></button>
            ) : null}
          </div>
          {categories.length > 0 ? (
            <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              {["all", ...categories].map((name) => (
                <button key={name} type="button" onClick={() => setCategory(name)} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium capitalize", activeCategory === name ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-white/50 hover:bg-white/[0.06]")}>
                  {name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {held.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06] px-3 py-2 sm:px-6">
            {held.map((order) => (
              <button key={order.id} type="button" onClick={() => resume(order)} className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 hover:bg-amber-400/10">
                <Pause className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-mono text-xs text-amber-200">
                  {order.lines.reduce((sum, line) => sum + line.quantity, 0)} items · {money(currency, order.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0))}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          {products.length === 0 ? (
            <div className="py-20 text-center"><Package className="mx-auto mb-3 h-12 w-12 text-white/10" /><p className="text-white/40">No products available at this location.</p></div>
          ) : visible.length === 0 ? (
            <div className="py-20 text-center"><Search className="mx-auto mb-3 h-12 w-12 text-white/10" /><p className="text-white/40">Nothing matches "{query}".</p></div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visible.map((product) => {
                const inCart = quantities.get(product.id) ?? 0;
                const out = product.stock <= 0;
                const low = !out && product.stock <= product.lowStockAt;
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={out}
                    onClick={() => handleAdd(product)}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-2xl border bg-white/[0.03] text-left transition active:scale-[0.97]",
                      inCart > 0 ? "border-emerald-400/50" : "border-white/[0.08] hover:border-emerald-400/30 hover:bg-white/[0.06]",
                      "disabled:cursor-not-allowed disabled:opacity-30"
                    )}
                  >
                    <div className="flex h-20 w-full items-center justify-center bg-white/[0.04] sm:h-24">
                      {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package className="h-7 w-7 text-white/15" />}
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-3">
                      <p className="line-clamp-2 text-sm font-medium leading-tight">{product.name}</p>
                      <div className="mt-auto">
                        <p className="font-mono text-base font-bold tabular-nums">{money(currency, product.price)}</p>
                        <p className={cn("text-[11px]", out ? "text-red-400" : low ? "text-amber-400" : "text-white/35")}>{out ? "Out of stock" : `${product.stock} left`}</p>
                      </div>
                    </div>
                    {inCart > 0 ? <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-xs font-bold text-[#0B0F1A]">{inCart}</span> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] bg-[#0B0F1A] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          {cart.length > 0 ? (
            <button type="button" onClick={() => setCartOpen(true)} className="flex h-14 w-full items-center justify-between rounded-2xl bg-emerald-500 px-5 font-semibold text-[#0B0F1A] active:scale-[0.99]">
              <span className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> {itemCount} item{itemCount === 1 ? "" : "s"}</span>
              <span className="font-mono">{money(currency, subtotal)}</span>
            </button>
          ) : (
            <p className="py-3 text-center text-sm text-white/40">Tap a product or scan a barcode to start</p>
          )}
        </div>
      </section>

      {cartOpen ? <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setCartOpen(false)} /> : null}

      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 top-12 z-50 flex flex-col rounded-t-3xl border-t border-white/10 bg-[#0F1420] transition-transform duration-300",
          "lg:static lg:z-auto lg:w-[26rem] lg:translate-y-0 lg:rounded-none lg:border-l lg:border-t-0 xl:w-[28rem]",
          cartOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Current sale</p>
            <p className="text-xs text-white/40">{itemCount} item{itemCount === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-1">
            {cart.length > 0 ? (
              <button type="button" onClick={() => window.confirm("Clear this sale?") && resetSale()} className="rounded-lg p-2 text-white/40 hover:bg-white/[0.06] hover:text-red-400" aria-label="Clear sale"><Trash2 className="h-4 w-4" /></button>
            ) : null}
            <button type="button" onClick={() => setCartOpen(false)} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] lg:hidden" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-white/25"><ShoppingCart className="h-9 w-9" /><p className="text-sm">Tap a product to begin</p></div>
          ) : (
            <div>
              <AnimatePresence initial={false}>
                {cart.map((line) => (
                  <motion.div key={line.productId} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex items-center gap-3 border-b border-white/[0.05] py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white/90">{line.name}</p>
                      <p className="font-mono text-[11px] text-white/40">{money(currency, line.unitPrice)} each</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => adjust(line.productId, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12]" aria-label="Remove one"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-6 text-center font-mono text-sm">{line.quantity}</span>
                      <button type="button" onClick={() => adjust(line.productId, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12]" aria-label="Add one"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <span className="w-20 shrink-0 text-right font-mono text-sm tabular-nums">{(line.unitPrice * line.quantity).toLocaleString()}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {cart.length > 0 ? (
            <>
              <button type="button" onClick={() => setCustomerOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left hover:bg-white/[0.07]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08]"><Users className="h-4 w-4 text-white/60" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{customer?.name ?? "Walk-in customer"}</span>
                  <span className="block truncate text-[11px] text-white/40">{customerNote}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
              </button>

              <div className="space-y-2">
                <p className="text-xs font-medium text-white/40">Payment</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {METHODS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setMethod(item.value);
                        setRedeemPoints(0);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors",
                        method === item.value ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-[10px] leading-none">{item.label}</span>
                    </button>
                  ))}
                </div>

                {method === "CASH" ? (
                  <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <Input inputMode="decimal" value={cashReceived} onChange={(event) => setCashReceived(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="Cash received (optional)" className={cn("h-10 font-mono", field)} />
                    <div className="flex flex-wrap gap-1.5">
                      {quickCash.map((value) => (
                        <button key={value} type="button" onClick={() => setCashReceived(String(value))} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/[0.06]">
                          {value === total ? "Exact" : money(currency, value)}
                        </button>
                      ))}
                    </div>
                    {cashReceived.trim() !== "" && !cashShort && cashNumber > total ? (
                      <p className="text-sm font-semibold text-amber-300">Change due {money(currency, cashNumber - total)}</p>
                    ) : null}
                  </div>
                ) : null}

                {later ? (
                  <div className="space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                    <p className="text-xs text-amber-200/90">The customer takes the goods now and pays later. The sale stays in Unpaid until it's collected.</p>
                    <Input inputMode="decimal" value={deposit} onChange={(event) => setDeposit(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="Deposit paid now (optional)" className={cn("h-10 font-mono", field)} />
                    {depositNumber > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {DEPOSIT_METHODS.map((item) => (
                          <button key={item.value} type="button" onClick={() => setDepositMethod(item.value)} className={cn("rounded-full border px-3 py-1 text-xs", depositMethod === item.value ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-white/60")}>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {depositNumber > 0 && !depositBad ? <p className="text-xs text-white/60">{money(currency, total - depositNumber)} will still be owed.</p> : null}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-white/40">Discount</p>
                  <Input inputMode="decimal" value={discount || ""} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value.replace(/[^0-9.]/g, "")) || 0))} placeholder="0" className={cn("h-10 font-mono", field)} />
                </div>
                {maxRedeem > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-white/40">Redeem points ({customer?.loyaltyPoints})</p>
                    <Input inputMode="numeric" value={redeemPoints || ""} onChange={(event) => setRedeemPoints(Math.max(0, Math.min(maxRedeem, Number(event.target.value.replace(/\D/g, "")) || 0)))} placeholder="0" className={cn("h-10 font-mono", field)} />
                  </div>
                ) : null}
              </div>
              {redeem > 0 ? <p className="-mt-3 text-xs text-emerald-300">{redeem} points take {money(currency, redeem * pointValue)} off.</p> : null}
            </>
          ) : null}
        </div>

        <div className="space-y-3 border-t border-white/[0.06] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="space-y-1">
            {totalDiscount > 0 ? (
              <div className="flex justify-between text-xs text-white/45"><span>Discount</span><span className="font-mono">-{money(currency, totalDiscount)}</span></div>
            ) : null}
            <div className="flex items-end justify-between">
              <span className="text-sm text-white/50">Total</span>
              <span className="font-mono text-3xl font-bold tabular-nums sm:text-4xl">{money(currency, total)}</span>
            </div>
          </div>
          {hint && cart.length > 0 ? <p className="text-xs text-amber-300">{hint}</p> : null}
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button variant="outline" onClick={holdOrder} disabled={cart.length === 0} className="h-12 border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"><Pause className="mr-2 h-4 w-4" /> Hold</Button>
            <Button onClick={checkout} disabled={!canCharge} className="h-12 bg-emerald-500 text-base font-bold text-[#0B0F1A] hover:bg-emerald-400">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : later ? "Save as unpaid" : `Charge ${money(currency, total)}`}
            </Button>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {feedback ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn("fixed bottom-24 left-1/2 z-[100] max-w-[90vw] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg lg:bottom-6", feedback.type === "success" ? "bg-emerald-500 text-[#0B0F1A]" : "bg-red-500 text-white")}
          >
            {feedback.message}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CustomerDialog open={customerOpen} onOpenChange={setCustomerOpen} customers={customers} selectedId={customerId} currency={currency} onSelect={selectCustomer} />

      <Dialog open={!!receipt} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto border-white/10 bg-[#0F1420] text-white">
          <DialogHeader><DialogTitle>{receipt?.sale.status === "PENDING" ? "Saved as unpaid" : "Payment received"}</DialogTitle></DialogHeader>
          {receipt ? (
            <>
              <div className="space-y-3 text-sm">
                <div className="space-y-0.5 text-center">
                  <p className="text-base font-semibold">{businessName}</p>
                  <p className="font-mono text-[11px] text-white/40">{receipt.sale.receiptNumber}</p>
                  <p className="text-[11px] text-white/40">{new Date(receipt.sale.createdAt).toLocaleString()}</p>
                  <p className="text-[11px] text-white/40">{receipt.sale.customerName ?? "Walk-in customer"}</p>
                </div>
                <div className="space-y-1.5 border-t border-dashed border-white/10 pt-2">
                  {receipt.sale.items.map((item: any) => (
                    <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="truncate">{item.name}</p>
                        <p className="text-white/40">{item.quantity} × {money(currency, item.unitPrice)}</p>
                      </div>
                      <span className="shrink-0">{money(currency, item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 border-t border-dashed border-white/10 pt-2 text-xs">
                  {receipt.sale.discount > 0 ? <div className="flex justify-between text-white/60"><span>Discount</span><span>-{money(currency, receipt.sale.discount)}</span></div> : null}
                  <div className="flex justify-between pt-1 text-base font-bold"><span>Total</span><span>{money(currency, receipt.sale.total)}</span></div>
                  {receipt.sale.status === "PENDING" ? (
                    <>
                      <div className="flex justify-between text-white/60"><span>Paid so far</span><span>{money(currency, receipt.sale.amountPaid ?? 0)}</span></div>
                      <div className="flex justify-between font-semibold text-amber-300"><span>Balance due</span><span>{money(currency, receipt.sale.balance ?? receipt.sale.total)}</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-white/60"><span>Payment</span><span>{METHOD_NAMES[receipt.sale.paymentMethod] ?? receipt.sale.paymentMethod}</span></div>
                      {receipt.cashReceived !== undefined ? (
                        <>
                          <div className="flex justify-between text-white/60"><span>Cash received</span><span>{money(currency, receipt.cashReceived)}</span></div>
                          <div className="flex justify-between font-semibold text-amber-300"><span>Change</span><span>{money(currency, Math.max(0, receipt.cashReceived - receipt.sale.total))}</span></div>
                        </>
                      ) : null}
                    </>
                  )}
                </div>
                {receipt.warning ? <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2.5 text-xs text-amber-200">{receipt.warning}</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => saveReceipt(receiptText(receipt.sale, businessName, currency, receipt.cashReceived), receipt.sale.receiptNumber)}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
                <Button className="bg-emerald-500 font-semibold text-[#0B0F1A] hover:bg-emerald-400" onClick={() => window.print()}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                </Button>
              </div>
              <Button variant="ghost" className="w-full text-white/60 hover:bg-white/5 hover:text-white" onClick={() => setReceipt(null)}>New sale</Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <CameraBarcodeScanner open={cameraOpen} onOpenChange={setCameraOpen} onDetect={(code) => { setCameraOpen(false); void scan(code); }} />

      <PrintArea text={receipt ? receiptText(receipt.sale, businessName, currency, receipt.cashReceived) : null} />
    </div>
  );
}