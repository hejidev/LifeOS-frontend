"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Banknote, Keyboard, Monitor, Pause, ShoppingCart, Volume2, VolumeX, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CameraBarcodeScanner } from "@/components/merchant/camera-barcode-scanner";
import { money } from "@/components/merchant/ops-ui";
import { CheckoutPanel } from "@/components/pos/checkout-panel";
import { CustomerDialog } from "@/components/pos/customer-dialog";
import { PrintArea } from "@/components/pos/print-area";
import { ProductBrowser } from "@/components/pos/product-browser";
import { ReceiptDialog } from "@/components/pos/receipt-dialog";
import type { ReceiptState } from "@/components/pos/receipt-dialog";
import { useStoreContext } from "@/lib/context/store-context";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { useBusinessCustomers, useBusinessProducts, useBusinessProfile, useCreateSale, useLookupProductByBarcode } from "@/lib/hooks/use-life-data";
import { dateKey, useCollectPayment, useDailyReport, useRefreshOps, useRegisterCurrent } from "@/lib/hooks/use-merchant-ops";
import { usePosDisplayBroadcast } from "@/lib/hooks/use-pos-display";
import { usePersisted, useOnline } from "@/lib/pos/hooks";
import { DEFAULT_PREFS, EMPTY_DRAFT, discountAmount, linesSubtotal, matchProduct, receiptText, tone } from "@/lib/pos/helpers";
import type { Customer, Draft, Held, Method, Prefs, Product } from "@/lib/pos/helpers";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  ["F2 or /", "Search or scan"],
  ["F4", "Choose a customer"],
  ["F8 or Ctrl+Enter", "Charge"],
  ["F9", "Hold this order"],
  ["Esc", "Clear the search"],
];

export default function POSPage() {
  const { currentStore, currentStoreId } = useStoreContext();
  const storeKey = currentStoreId ?? "default";
  const { data: productData = [] } = useBusinessProducts(true);
  const { data: customerData = [] } = useBusinessCustomers();
  const { data: profile } = useBusinessProfile();
  const { mutateAsync: createSale } = useCreateSale();
  const { mutateAsync: collectPayment } = useCollectPayment();
  const { mutateAsync: lookupBarcode } = useLookupProductByBarcode();
  const refreshOps = useRefreshOps();
  const report = useDailyReport(dateKey(new Date()));
  const register = useRegisterCurrent();
  const online = useOnline();

  const products = productData as Product[];
  const customers = customerData as Customer[];
  const settings = profile as any;
  const businessName: string = settings?.businessName ?? "Your store";
  const currency: string = settings?.currency ?? "NGN";
  const pointValue = Number(settings?.loyaltyRedemptionValue ?? 0);
  const loyaltyOn = !!settings?.loyaltyEnabled && pointValue > 0;

  const [draft, setDraft, draftReady] = usePersisted<Draft>(`lifeos:pos:${storeKey}:draft`, EMPTY_DRAFT);
  const [held, setHeld] = usePersisted<Held[]>(`lifeos:pos:${storeKey}:held`, []);
  const [pins, setPins] = usePersisted<string[]>("lifeos:pos:pins", []);
  const [storedPrefs, setPrefs] = usePersisted<Prefs>("lifeos:pos:prefs", DEFAULT_PREFS);
  const prefs = useMemo(() => ({ ...DEFAULT_PREFS, ...storedPrefs }), [storedPrefs]);

  const [method, setMethod] = useState<Method>("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [deposit, setDeposit] = useState("");
  const [depositMethod, setDepositMethod] = useState("CASH");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [pickedCustomer, setPickedCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const update = useCallback(
    (change: (current: Draft) => Draft) => {
      const next = change(draftRef.current);
      draftRef.current = next;
      setDraft(next);
    },
    [setDraft]
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const attemptRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconciled = useRef<string | null>(null);

  const [displaySession] = useState(() => crypto.randomUUID());
  const { publish } = usePosDisplayBroadcast(displaySession);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const flash = useCallback(
    (type: "success" | "error", message: string) => {
      if (prefs.sound) tone(type === "success" ? "ok" : "error");
      setFeedback({ type, message });
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFeedback(null), 2200);
    },
    [prefs.sound]
  );

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!draftReady || products.length === 0 || reconciled.current === storeKey) return;
    reconciled.current = storeKey;
    update((current) => ({
      ...current,
      lines: current.lines.flatMap((line) => {
        const product = productMap.get(line.productId);
        if (!product || product.stock <= 0) return [];
        const overridden = line.unitPrice !== line.listPrice;
        return [{ ...line, name: product.name, listPrice: product.price, unitPrice: overridden ? line.unitPrice : product.price, quantity: Math.min(line.quantity, product.stock) }];
      }),
    }));
  }, [draftReady, products.length, storeKey, productMap, update]);

  const lines = draft.lines;
  const customer = customers.find((item) => item.id === draft.customerId) ?? (pickedCustomer?.id === draft.customerId ? pickedCustomer : null);
  const later = method === "LATER";
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = linesSubtotal(lines);
  const manual = discountAmount(draft, subtotal);
  const maxRedeem = loyaltyOn && customer && !later ? Math.max(0, Math.min(customer.loyaltyPoints ?? 0, Math.floor(Math.max(0, subtotal - manual) / pointValue))) : 0;
  const redeem = Math.min(redeemPoints, maxRedeem);
  const redeemValue = Math.min(Math.max(0, subtotal - manual), redeem * pointValue);
  const total = Math.max(0, subtotal - manual - redeemValue);
  const totals = { subtotal, manual, redeem, redeemValue, maxRedeem, total, itemCount };

  const cashNumber = cashReceived.trim() === "" ? total : Number(cashReceived);
  const cashShort = method === "CASH" && (!Number.isFinite(cashNumber) || cashNumber < total);
  const depositNumber = later ? Number(deposit) || 0 : 0;
  const depositBad = later && depositNumber > 0 && depositNumber >= total;

  const hint = !online
    ? "You're offline. Reconnect to charge."
    : later && !draft.customerId
      ? "Choose a customer to sell on credit."
      : later && total <= 0
        ? "There's nothing to collect later."
        : depositBad
          ? "The deposit must be less than the total."
          : cashShort
            ? `Cash received is short by ${money(currency, Math.max(0, total - (Number.isFinite(cashNumber) ? cashNumber : 0)))}.`
            : null;
  const canCharge = lines.length > 0 && !submitting && !hint;

  const quantities = useMemo(() => new Map(lines.map((line) => [line.productId, line.quantity])), [lines]);

  useEffect(() => {
    publish({
      businessName,
      currency,
      lines: lines.map((line) => ({ name: line.name, quantity: line.quantity, unitPrice: line.unitPrice })),
      discount: manual + redeemValue,
      total,
      status: lines.length > 0 ? "shopping" : "idle",
    });
  }, [lines, manual, redeemValue, total, publish, businessName, currency]);

  const addProduct = useCallback(
    (product: Product): "added" | "maxed" | "out" => {
      if (product.stock <= 0) return "out";
      const existing = draftRef.current.lines.find((line) => line.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return "maxed";
        update((current) => ({ ...current, lines: current.lines.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line)) }));
        return "added";
      }
      update((current) => ({ ...current, lines: [...current.lines, { productId: product.id, name: product.name, unitPrice: product.price, listPrice: product.price, quantity: 1 }] }));
      return "added";
    },
    [update]
  );

  const handleAdd = useCallback(
    (product: Product) => {
      const result = addProduct(product);
      if (result === "added") {
        if (prefs.sound) tone("ok");
        return true;
      }
      flash("error", result === "maxed" ? `Only ${product.stock} of ${product.name} in stock` : `${product.name} is out of stock`);
      return false;
    },
    [addProduct, flash, prefs.sound]
  );

  function setQuantity(productId: string, quantity: number) {
    const stock = productMap.get(productId)?.stock ?? Infinity;
    if (quantity > stock) flash("error", `Only ${stock} in stock`);
    update((current) => ({
      ...current,
      lines: current.lines.flatMap((line) => (line.productId !== productId ? [line] : quantity <= 0 ? [] : [{ ...line, quantity: Math.min(stock, quantity) }])),
    }));
  }

  function setPrice(productId: string, price: number) {
    update((current) => ({ ...current, lines: current.lines.map((line) => (line.productId === productId ? { ...line, unitPrice: price } : line)) }));
  }

  function removeLine(productId: string) {
    update((current) => ({ ...current, lines: current.lines.filter((line) => line.productId !== productId) }));
  }

  const scan = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      let product = products.find((item) => item.barcode === code || item.sku === code);
      if (!product) {
        try {
          product = (await lookupBarcode(code))?.product as Product | undefined;
        } catch {
          product = undefined;
        }
      }
      if (!product) return flash("error", `No product found for ${code}`);
      if (handleAdd(product)) flash("success", `Added ${product.name}`);
    },
    [products, lookupBarcode, handleAdd, flash]
  );

  useBarcodeScanner(scan, !receipt && !customerOpen && !cameraOpen && !shortcutsOpen);

  function submitQuery() {
    const text = query.trim();
    if (!text) return;
    const exact = products.find((item) => item.barcode === text || item.sku === text);
    const matches = products.filter((item) => matchProduct(item, text));
    if (exact || matches.length === 1) {
      if (handleAdd(exact ?? matches[0])) setQuery("");
      return;
    }
    if (matches.length === 0 && /^[\w-]{4,}$/.test(text)) {
      void scan(text).then(() => setQuery(""));
      return;
    }
    flash("error", matches.length === 0 ? `Nothing found for "${text}"` : "Narrow the search, or tap a product");
  }

  function togglePin(id: string) {
    setPins((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function clearSale() {
    update(() => EMPTY_DRAFT);
    setPickedCustomer(null);
    setCashReceived("");
    setDeposit("");
    setRedeemPoints(0);
    setMethod("CASH");
    setError(null);
    attemptRef.current = null;
  }

  function holdOrder() {
    const current = draftRef.current;
    if (current.lines.length === 0) return;
    const label = customer?.name ?? `Order ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    setHeld((orders) => [...orders, { id: Date.now(), label, at: Date.now(), draft: current }]);
    clearSale();
    setCartOpen(false);
    flash("success", "Order held");
  }

  function resume(order: Held) {
    const current = draftRef.current;
    setHeld((orders) => {
      const rest = orders.filter((item) => item.id !== order.id);
      return current.lines.length > 0 ? [...rest, { id: Date.now(), label: customer?.name ?? "Earlier order", at: Date.now(), draft: current }] : rest;
    });
    update(() => order.draft);
    setPickedCustomer(null);
    setRedeemPoints(0);
    setCartOpen(true);
  }

  function selectCustomer(next: Customer | null) {
    update((current) => ({ ...current, customerId: next?.id ?? "" }));
    setPickedCustomer(next);
    setRedeemPoints(0);
    setCustomerOpen(false);
  }

  async function checkout() {
    if (!canCharge || submittingRef.current || receipt || customerOpen) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    const saleLines = draftRef.current.lines;
    const fingerprint = JSON.stringify([saleLines.map((line) => [line.productId, line.quantity, line.unitPrice]), draft.customerId, method, manual, redeem, draft.note]);
    const attempt = attemptRef.current?.fingerprint === fingerprint ? attemptRef.current : { fingerprint, id: crypto.randomUUID() };
    attemptRef.current = attempt;

    try {
      const created = await createSale({
        clientRequestId: attempt.id,
        customerId: draft.customerId || undefined,
        items: saleLines.map(({ productId, name, unitPrice, quantity }) => ({ productId, name, unitPrice, quantity })),
        discount: manual,
        paymentMethod: later ? "CASH" : method,
        status: later ? "PENDING" : "PAID",
        redeemPoints: redeem > 0 ? redeem : undefined,
        note: draft.note.trim() || undefined,
      });

      let sale = created?.sale ?? created;
      let warning: string | undefined;

      if (later && depositNumber > 0) {
        try {
          await collectPayment({ saleId: sale.id, paymentMethod: depositMethod, amount: depositNumber });
          sale = { ...sale, amountPaid: depositNumber, balance: Math.max(0, sale.total - depositNumber) };
        } catch (err) {
          warning = `The sale is saved as unpaid, but the deposit wasn't recorded (${err instanceof Error ? err.message : "unknown error"}). Record it from the Sales page.`;
        }
      }

      publish({ businessName, currency, lines: saleLines.map((line) => ({ name: line.name, quantity: line.quantity, unitPrice: line.unitPrice })), discount: sale.discount, total: sale.total, status: later ? "idle" : "paid" });
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => publish({ businessName, currency, lines: [], discount: 0, total: 0, status: "idle" }), 4000);

      if (prefs.sound) tone("done");
      setReceipt({ sale, warning, phone: customer?.phone, cashReceived: method === "CASH" && cashReceived.trim() !== "" ? Number(cashReceived) : undefined });
      clearSale();
      setCartOpen(false);
      refreshOps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't complete the sale.");
      if (prefs.sound) tone("error");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const keys = useRef({ charge: () => {}, hold: () => {}, customer: () => {}, focus: () => {} });
  useEffect(() => {
    keys.current = {
      charge: () => void checkout(),
      hold: holdOrder,
      customer: () => !receipt && setCustomerOpen(true),
      focus: () => inputRef.current?.focus(),
    };
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (event.key === "F2" || (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey)) {
        event.preventDefault();
        keys.current.focus();
      } else if (event.key === "F4") {
        event.preventDefault();
        keys.current.customer();
      } else if (event.key === "F8" || ((event.ctrlKey || event.metaKey) && event.key === "Enter")) {
        event.preventDefault();
        keys.current.charge();
      } else if (event.key === "F9") {
        event.preventDefault();
        keys.current.hold();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openDisplay() {
    window.open(`/merchant/pos/customer-display?session=${displaySession}`, "pos-customer-display", "width=1024,height=768");
    setDisplayOpen(true);
  }

  const today = report.data?.summary;
  const iconButton = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white";

  return (
    <div className="fixed inset-0 z-40 flex h-dvh flex-col overflow-hidden bg-[#080B14] text-white">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0B0F1A] px-3 py-2.5 sm:gap-3 sm:px-5">
        <Link href="/merchant/dashboard" className="flex shrink-0 items-center gap-1.5 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <div className="hidden h-5 w-px bg-white/10 sm:block" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Point of sale</p>
          {currentStore?.name ? <p className="truncate text-[11px] text-white/40">{currentStore.name}</p> : null}
        </div>
        <div className="flex-1" />

        {today ? (
          <div className="hidden items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-1.5 md:flex">
            <div><p className="text-[10px] uppercase tracking-wide text-white/35">Today</p><p className="font-mono text-sm font-semibold tabular-nums">{money(currency, today.revenue)}</p></div>
            <div className="h-6 w-px bg-white/10" />
            <div><p className="text-[10px] uppercase tracking-wide text-white/35">Sales</p><p className="font-mono text-sm font-semibold tabular-nums">{today.orders}</p></div>
          </div>
        ) : null}

        <Link href="/merchant/register" className={cn("hidden shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium sm:flex", register.data ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300")}>
          <Banknote className="h-3.5 w-3.5" />
          {register.data ? `Register open · ${money(currency, register.data.cash.expected)}` : "Register closed"}
        </Link>

        <button type="button" aria-label={prefs.sound ? "Mute sounds" : "Unmute sounds"} onClick={() => setPrefs({ ...prefs, sound: !prefs.sound })} className={iconButton}>
          {prefs.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button type="button" aria-label="Keyboard shortcuts" onClick={() => setShortcutsOpen(true)} className={cn(iconButton, "hidden sm:flex")}><Keyboard className="h-4 w-4" /></button>
        <button type="button" aria-label="Open customer display" title={displayOpen ? "Reopen customer display" : "Open customer display"} onClick={openDisplay} className={iconButton}><Monitor className="h-4 w-4" /></button>
      </header>

      {!online ? (
        <div className="flex shrink-0 items-center justify-center gap-2 bg-red-500/90 px-3 py-1.5 text-xs font-medium">
          <WifiOff className="h-3.5 w-3.5" /> You're offline. Charging is paused until the connection returns. Your cart is saved on this device.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {held.length > 0 ? (
            <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/[0.06] bg-amber-400/[0.03] px-3 py-2 sm:px-5">
              <Pause className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              {held.map((order) => (
                <div key={order.id} className="flex shrink-0 items-center rounded-full border border-amber-400/25 bg-amber-400/10">
                  <button type="button" onClick={() => resume(order)} className="py-1 pl-3 pr-2 text-xs text-amber-100 hover:text-white">
                    {order.label} · {order.draft.lines.reduce((sum, line) => sum + line.quantity, 0)} items · {money(currency, linesSubtotal(order.draft.lines))}
                  </button>
                  <button type="button" aria-label="Discard held order" onClick={() => window.confirm("Discard this held order?") && setHeld((orders) => orders.filter((item) => item.id !== order.id))} className="py-1 pl-1 pr-2.5 text-amber-200/60 hover:text-red-300"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          ) : null}

          <ProductBrowser
            products={products}
            currency={currency}
            quantities={quantities}
            pins={pins}
            query={query}
            prefs={prefs}
            inputRef={inputRef}
            onQuery={setQuery}
            onSubmit={submitQuery}
            onAdd={handleAdd}
            onPin={togglePin}
            onPrefs={setPrefs}
            onCamera={() => setCameraOpen(true)}
          />

          <div className="shrink-0 border-t border-white/[0.06] bg-[#0B0F1A] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
            {lines.length > 0 ? (
              <button type="button" onClick={() => setCartOpen(true)} className="flex h-14 w-full items-center justify-between rounded-2xl bg-emerald-500 px-5 font-semibold text-[#0B0F1A] active:scale-[0.99]">
                <span className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> View sale · {itemCount} item{itemCount === 1 ? "" : "s"}</span>
                <span className="font-mono">{money(currency, total)}</span>
              </button>
            ) : (
              <p className="py-3 text-center text-sm text-white/40">Tap a product or scan a barcode to start</p>
            )}
          </div>
        </section>

        {cartOpen ? <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setCartOpen(false)} /> : null}

        <aside
          className={cn(
            "fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col rounded-t-3xl border-t border-white/10 bg-[#0F1420] shadow-2xl transition-transform duration-300",
            "lg:static lg:z-auto lg:w-[27rem] lg:translate-y-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none xl:w-[30rem]",
            cartOpen ? "translate-y-0" : "translate-y-full"
          )}
        >
          <CheckoutPanel
            currency={currency}
            lines={lines}
            draft={draft}
            customer={customer}
            totals={totals}
            method={method}
            cashReceived={cashReceived}
            deposit={deposit}
            depositMethod={depositMethod}
            loyaltyOn={loyaltyOn}
            hint={hint}
            error={error}
            submitting={submitting}
            canCharge={canCharge}
            onMethod={(next) => {
              setMethod(next);
              setRedeemPoints(0);
            }}
            onCash={setCashReceived}
            onDeposit={setDeposit}
            onDepositMethod={setDepositMethod}
            onRedeem={setRedeemPoints}
            onQty={setQuantity}
            onPrice={setPrice}
            onRemove={removeLine}
            onDraft={(patch) => update((current) => ({ ...current, ...patch }))}
            onCustomer={() => setCustomerOpen(true)}
            onClear={clearSale}
            onHold={holdOrder}
            onCharge={() => void checkout()}
            onClose={() => setCartOpen(false)}
          />
        </aside>
      </div>

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

      <CustomerDialog open={customerOpen} onOpenChange={setCustomerOpen} customers={customers} selectedId={draft.customerId} currency={currency} onSelect={selectCustomer} />
      <ReceiptDialog receipt={receipt} businessName={businessName} currency={currency} onClose={() => { setReceipt(null); inputRef.current?.focus(); }} />

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-sm border-white/10 bg-[#0F1420] text-white">
          <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle></DialogHeader>
          <div className="space-y-1">
            {SHORTCUTS.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-white/[0.05]">
                <span className="text-white/70">{label}</span>
                <kbd className="rounded border border-white/15 bg-white/[0.06] px-2 py-0.5 font-mono text-xs">{key}</kbd>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40">A barcode scanner works anywhere on this page. Typing a barcode and pressing Enter works too.</p>
        </DialogContent>
      </Dialog>

      <CameraBarcodeScanner open={cameraOpen} onOpenChange={setCameraOpen} onDetect={(code) => { setCameraOpen(false); void scan(code); }} />

      <PrintArea text={receipt ? receiptText(receipt.sale, businessName, currency, receipt.cashReceived) : null} />
    </div>
  );
}