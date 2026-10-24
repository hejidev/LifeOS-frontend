"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, LogOut, Sparkles, Users, RotateCcw, MessageSquare, UserCircle2,
  Plus, Minus, ShoppingCart, X, Store, Receipt, Download, Printer, Search,
  ScanLine, Camera, Monitor, CalendarClock, CloudOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { NetworkError, StaffSessionExpiredError, isTransientError, staffApi } from "@/lib/api/staff-client";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { usePosDisplayBroadcast } from "@/lib/hooks/use-pos-display";
import { CameraBarcodeScanner } from "@/components/merchant/camera-barcode-scanner";
import { OfflineBanner } from "@/components/pos/offline-banner";
import { PendingSalesDialog } from "@/components/pos/pending-sales-dialog";
import { PrintArea } from "@/components/pos/print-area";
import { deleteMeta, getMeta, setMeta } from "@/lib/offline/db";
import { makeReceiptNumber } from "@/lib/offline/utils";
import { useCatalog } from "@/lib/offline/use-catalog";
import { useOfflineQueue } from "@/lib/offline/use-offline-queue";
import type {
  CachedSession, LoyaltyConfig, PaymentMethod, Product, SalePayload, SaleRecord, StaffMe, StaffProfile,
} from "@/lib/offline/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const SESSION_KEY = "session";
const ONLINE_ATTEMPT_TIMEOUT_MS = 8000;
const DEFAULT_LOYALTY: LoyaltyConfig = { enabled: false, redemptionValue: 1, earnRate: 1 };
const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD", "TRANSFER", "MOBILE_MONEY"];

const QUICK_ACTIONS = [
  { action: "CUSTOMER_ADDED", label: "Helped a customer", icon: Users, color: "text-sky-500 bg-sky-500/10" },
  { action: "REFUND_ISSUED", label: "Processed a return", icon: RotateCcw, color: "text-amber-500 bg-amber-500/10" },
  { action: "OTHER", label: "Note", icon: MessageSquare, color: "text-violet-500 bg-violet-500/10" },
];

type CartItem = { productId: string; name: string; unitPrice: number; quantity: number; stock: number };
type AddResult = "added" | "maxed" | "out_of_stock";

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

function buildReceiptText(sale: SaleRecord, businessName: string, currency: string, staffName: string) {
  const width = 42;
  const line = (left: string, right: string) => `${left}${" ".repeat(Math.max(1, width - left.length - right.length))}${right}`;
  const money = (amount: number) => `${currency} ${amount.toLocaleString()}`;
  return [
    businessName,
    `Receipt ${sale.receiptNumber}`,
    new Date(sale.createdAt).toLocaleString(),
    `Customer: ${sale.customerName ?? "Walk-in"}`,
    "-".repeat(width),
    ...sale.items.flatMap((item) => [
      item.name,
      line(`  ${item.quantity} x ${money(item.unitPrice)}`, money(item.lineTotal)),
    ]),
    "-".repeat(width),
    ...(sale.discount > 0 ? [line("Subtotal", money(sale.subtotal)), line("Discount", `-${money(sale.discount)}`)] : []),
    line("Total", money(sale.total)),
    "",
    `Payment: ${sale.paymentMethod.replace("_", " ")}`,
    `Served by: ${staffName}`,
    "",
    "Thank you for your business!",
  ].join("\n");
}

function downloadReceipt(sale: SaleRecord, businessName: string, currency: string, staffName: string) {
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

  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyConfig>(DEFAULT_LOYALTY);
  const [scope, setScope] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<"loading" | "ready" | "needs-network">("loading");

  const [shiftStart] = useState(new Date());
  const [activity, setActivity] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [clockOutConfirm, setClockOutConfirm] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const [saleOpen, setSaleOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [receipt, setReceipt] = useState<SaleRecord | null>(null);
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [scanBarcodeInput, setScanBarcodeInput] = useState("");

  const cartRef = useRef<CartItem[]>([]);
  const submittingRef = useRef(false);
  const attemptRef = useRef<{ fingerprint: string; id: string; receiptNumber: string } | null>(null);
  const idleResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const elapsed = useElapsedTime(shiftStart);
  const clock = useClock();

  const [displaySession] = useState(() => crypto.randomUUID());
  const { publish } = usePosDisplayBroadcast(displaySession);

  const {
    online, syncing, sessionExpired, entries, pending, failed, foreignCount, syncVersion,
    markOffline, markSessionExpired, enqueue, syncNow, retry, discard, isSalePending,
  } = useOfflineQueue(scope);

  const {
    products, customers, loading: catalogLoading, error: catalogError, savedAt: catalogSavedAt,
    refresh: refreshCatalog, findByBarcode,
  } = useCatalog({ scope, online, pending, syncVersion, markOffline, markSessionExpired });

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const flash = useCallback((type: "success" | "error", message: string) => {
    setScanFeedback({ type, message });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setScanFeedback(null), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (idleResetTimeoutRef.current) clearTimeout(idleResetTimeoutRef.current);
    };
  }, []);

  const applySession = useCallback((data: StaffMe) => {
    setStaff(data.staff);
    setBusinessName(data.businessName ?? "");
    setCurrency(data.currency ?? "USD");
    setPermissions(data.permissions ?? []);
    setLoyalty(data.loyalty ?? DEFAULT_LOYALTY);
    setScope(data.scope ? `${data.scope.bizProfileId}:${data.scope.storeId}` : "unscoped");
    setSessionState("ready");
  }, []);

  const loadSession = useCallback(async () => {
    setSessionState("loading");
    try {
      const data = await staffApi.get<StaffMe>("/staff-session/me", { timeoutMs: 8000, redirectOnExpire: false });
      const cached: CachedSession = { me: data, savedAt: Date.now() };
      void setMeta(SESSION_KEY, cached).catch(() => {});
      applySession(data);
    } catch (err) {
      if (err instanceof StaffSessionExpiredError) {
        router.push("/staff/login");
        return;
      }
      const cached = await getMeta<CachedSession>(SESSION_KEY).catch(() => null);
      if (cached?.me) {
        if (err instanceof NetworkError) markOffline();
        applySession(cached.me);
        return;
      }
      setSessionState("needs-network");
    }
  }, [applySession, markOffline, router]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleBackgroundError = useCallback(
    (err: unknown) => {
      if (err instanceof StaffSessionExpiredError) markSessionExpired();
      else if (err instanceof NetworkError) markOffline();
    },
    [markOffline, markSessionExpired]
  );

  const loadActivity = useCallback(async () => {
    try {
      const data = await staffApi.get("/staff-portal/activity", { redirectOnExpire: false, timeoutMs: 10000 });
      setActivity(data.activity);
    } catch (err) {
      handleBackgroundError(err);
    }
  }, [handleBackgroundError]);

  const loadTeam = useCallback(async () => {
    try {
      const data = await staffApi.get("/staff-portal/team", { redirectOnExpire: false, timeoutMs: 10000 });
      setTeam(data.team);
    } catch (err) {
      handleBackgroundError(err);
    }
  }, [handleBackgroundError]);

  const loadMyShifts = useCallback(async () => {
    try {
      const data = await staffApi.get("/my-shifts", { redirectOnExpire: false, timeoutMs: 10000 });
      setMyShifts(data.shifts);
    } catch (err) {
      handleBackgroundError(err);
    }
  }, [handleBackgroundError]);

  useEffect(() => {
    if (sessionState !== "ready" || !online) return;
    void loadActivity();
    void loadTeam();
    void loadMyShifts();
  }, [sessionState, online, syncVersion, loadActivity, loadTeam, loadMyShifts]);

  const commitCart = useCallback((next: CartItem[]) => {
    cartRef.current = next;
    setCart(next);
  }, []);

  function addToCart(product: Product): AddResult {
    if (product.stock <= 0) return "out_of_stock";
    const current = cartRef.current;
    const existing = current.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return "maxed";
      commitCart(
        current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, stock: product.stock, unitPrice: product.price }
            : item
        )
      );
      return "added";
    }
    commitCart([
      ...current,
      { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1, stock: product.stock },
    ]);
    return "added";
  }

  function handleAddProduct(product: Product) {
    const result = addToCart(product);
    if (result === "maxed") flash("error", `Only ${product.stock} of ${product.name} in stock`);
    if (result === "out_of_stock") flash("error", `${product.name} is out of stock`);
  }

  function adjustQty(productId: string, delta: number) {
    commitCart(
      cartRef.current.flatMap((item): CartItem[] => {
        if (item.productId !== productId) return [item];
        const quantity = Math.min(item.stock, item.quantity + delta);
        return quantity <= 0 ? [] : [{ ...item, quantity }];
      })
    );
  }

  function removeItem(productId: string) {
    commitCart(cartRef.current.filter((item) => item.productId !== productId));
  }

  function cartQtyFor(productId: string) {
    return cart.find((item) => item.productId === productId)?.quantity ?? 0;
  }

  async function handleBarcodeScan(code: string) {
    try {
      const product = await findByBarcode(code);
      if (!product) {
        flash("error", `No product found for barcode ${code}`);
        return;
      }
      const result = addToCart(product);
      if (result === "added") {
        flash("success", `Added: ${product.name}`);
        setScanBarcodeInput("");
      } else if (result === "maxed") {
        flash("error", `Only ${product.stock} of ${product.name} in stock`);
      } else {
        flash("error", `${product.name} is out of stock`);
      }
    } catch (err) {
      flash("error", err instanceof Error ? err.message : "Couldn't look that up");
    }
  }

  useBarcodeScanner(handleBarcodeScan, saleOpen);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) ?? null,
    [customers, customerId]
  );
  const redemptionValue = loyalty.redemptionValue;
  const maxRedeemable =
    selectedCustomer && loyalty.enabled && redemptionValue > 0
      ? Math.min(selectedCustomer.loyaltyPoints, Math.ceil(subtotal / redemptionValue))
      : 0;
  const redeem = online ? Math.min(redeemPoints, maxRedeemable) : 0;
  const discount = Math.min(subtotal, redeem * redemptionValue);
  const total = Math.max(0, subtotal - discount);

  const filteredProducts = productSearchQuery
    ? products.filter((product) => product.name.toLowerCase().includes(productSearchQuery.toLowerCase()))
    : products;

  useEffect(() => {
    publish({
      businessName,
      currency,
      lines: cart.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
      discount,
      total,
      status: cart.length > 0 ? "shopping" : "idle",
      servedBy: staff?.name,
    });
  }, [cart, discount, total, publish, businessName, currency, staff]);

  function openCustomerDisplay() {
    window.open(`/merchant/pos/customer-display?session=${displaySession}`, "pos-customer-display", "width=1024,height=768");
  }

  function openSale() {
    if (!permissions.includes("CREATE_SALE")) return;
    setSaleOpen(true);
    setProductSearchQuery("");
    if (online) void refreshCatalog();
  }

  async function handleCheckout() {
    if (!staff || cart.length === 0 || submittingRef.current) return;
    submittingRef.current = true;
    setCheckingOut(true);

    const fingerprint = JSON.stringify({
      items: cart.map((item) => [item.productId, item.quantity]),
      customerId: customerId || null,
      paymentMethod,
      redeem,
    });
    const existing = attemptRef.current;
    const attempt =
      existing && existing.fingerprint === fingerprint
        ? existing
        : { fingerprint, id: crypto.randomUUID(), receiptNumber: makeReceiptNumber() };
    attemptRef.current = attempt;

    const soldAt = new Date().toISOString();
    const items = cart.map(({ productId, name, unitPrice, quantity }) => ({ productId, name, unitPrice, quantity }));
    const displayLines = cart.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice }));

    const finish = (sale: SaleRecord, savedLocally: boolean) => {
      attemptRef.current = null;
      publish({
        businessName,
        currency,
        lines: displayLines,
        discount: sale.discount,
        total: sale.total,
        status: "paid",
        servedBy: staff.name,
      });
      if (idleResetTimeoutRef.current) clearTimeout(idleResetTimeoutRef.current);
      idleResetTimeoutRef.current = setTimeout(() => {
        publish({ businessName, currency, lines: [], discount: 0, total: 0, status: "idle" });
      }, 4000);

      commitCart([]);
      setCustomerId("");
      setRedeemPoints(0);
      setSaleOpen(false);
      setReceipt(sale);
      setRecentSales((previous) => [sale, ...previous]);
      if (!savedLocally) {
        void loadActivity();
        void refreshCatalog();
      }
    };

    try {
      if (online) {
        try {
          const { sale } = await staffApi.post<{ sale: SaleRecord }>(
            "/staff-pos/sales",
            {
              clientRequestId: attempt.id,
              receiptNumber: attempt.receiptNumber,
              soldAt,
              customerId: customerId || undefined,
              items,
              paymentMethod,
              status: "PAID",
              redeemPoints: redeem > 0 ? redeem : undefined,
            },
            { timeoutMs: ONLINE_ATTEMPT_TIMEOUT_MS, redirectOnExpire: false }
          );
          finish(sale, false);
          return;
        } catch (err) {
          if (err instanceof StaffSessionExpiredError) {
            markSessionExpired();
          } else if (err instanceof NetworkError) {
            markOffline();
          } else if (!isTransientError(err)) {
            showToast("error", err instanceof Error ? err.message : "Couldn't complete the sale");
            void refreshCatalog();
            return;
          }
        }
      }

      if (redeem > 0) {
        showToast("error", "Loyalty points can't be confirmed without a connection. Remove the points discount or try again.");
        return;
      }

      const payload: SalePayload = {
        clientRequestId: attempt.id,
        receiptNumber: attempt.receiptNumber,
        soldAt,
        offline: true,
        staffId: staff.id,
        customerId: customerId || undefined,
        items,
        paymentMethod,
        status: "PAID",
      };

      const localSale: SaleRecord = {
        id: `local-${attempt.id}`,
        receiptNumber: attempt.receiptNumber,
        customerName: selectedCustomer?.name,
        items: items.map((item, index) => ({
          id: `${attempt.id}-${index}`,
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * item.quantity,
        })),
        subtotal,
        discount: 0,
        total: subtotal,
        paymentMethod,
        status: "PAID",
        createdAt: soldAt,
        pending: true,
      };

      await enqueue({ id: attempt.id, scope: scope ?? "unscoped", staffId: staff.id, soldAt, payload, sale: localSale });
      finish(localSale, true);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Couldn't save this sale on this PC");
    } finally {
      submittingRef.current = false;
      setCheckingOut(false);
    }
  }

  async function handleQuickAction(action: string, label: string) {
    if (action === "OTHER") {
      setNoteOpen(true);
      return;
    }
    try {
      await staffApi.post("/staff-portal/activity", { action, description: label }, { redirectOnExpire: false, timeoutMs: 10000 });
      showToast("success", `Logged: ${label}`);
      void loadActivity();
    } catch (err) {
      handleBackgroundError(err);
      showToast("error", err instanceof NetworkError ? "You're offline. Try again when connected." : (err as Error).message);
    }
  }

  async function handleNoteSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    try {
      await staffApi.post("/staff-portal/activity", { action: "OTHER", description: note }, { redirectOnExpire: false, timeoutMs: 10000 });
      setNote("");
      setNoteOpen(false);
      showToast("success", "Note logged");
      void loadActivity();
    } catch (err) {
      handleBackgroundError(err);
      showToast("error", err instanceof NetworkError ? "You're offline. Try again when connected." : (err as Error).message);
    }
  }

  async function handleConfirmClockOut() {
    if (!online) {
      showToast("error", "Connect to the internet to clock out. Your saved sales stay on this PC.");
      return;
    }
    setClockingOut(true);
    try {
      await staffApi.post("/staff-portal/clock-out", undefined, { redirectOnExpire: false, timeoutMs: 10000 });
      await fetch(`${API_URL}/staff-session/logout`, { method: "POST", credentials: "include" });
      await deleteMeta(SESSION_KEY).catch(() => {});
      router.push("/staff/login");
    } catch (err) {
      if (err instanceof StaffSessionExpiredError) {
        await deleteMeta(SESSION_KEY).catch(() => {});
        router.push("/staff/login");
        return;
      }
      if (err instanceof NetworkError) markOffline();
      showToast("error", "Couldn't clock out — try again");
    } finally {
      setClockingOut(false);
    }
  }

  if (sessionState === "needs-network") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-4 pt-6 text-center">
            <CloudOff className="mx-auto h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Can't open the terminal yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect to the internet once to sign in. After that it keeps working through outages.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => void loadSession()}>
                Try again
              </Button>
              <Button asChild className="flex-1">
                <Link href="/staff/login">Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!staff) return null;

  const todayCount = activity.length;
  const canSell = permissions.includes("CREATE_SALE");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:py-8 max-w-8xl">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-95 w-95 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-75 w-75 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative sm:max-w-7xl mx-auto space-y-4 sm:space-y-5">
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

        <OfflineBanner
          online={online}
          syncing={syncing}
          pendingCount={pending.length}
          failedCount={failed.length}
          foreignCount={foreignCount}
          sessionExpired={sessionExpired}
          catalogSavedAt={catalogSavedAt}
          onOpenQueue={() => setQueueOpen(true)}
          onSyncNow={() => void syncNow()}
        />

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

        <div className="grid grid-cols-[1fr_auto] gap-2">
          {canSell ? (
            <button
              onClick={openSale}
              className="h-16 rounded-2xl gradient-bg text-white font-semibold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <ShoppingCart className="h-5 w-5" /> New Sale
            </button>
          ) : (
            <div className="h-16 rounded-2xl border border-dashed border-border bg-muted/30 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="h-4 w-4" /> Sales access isn't enabled for your role
            </div>
          )}
          <button
            onClick={openCustomerDisplay}
            title="Open customer display"
            className="h-16 w-16 rounded-2xl border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Monitor className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

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
                {team.map((member) => (
                  <div key={member.id} className="flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium">{member.name}</span>
                    <span className="text-[10px] text-muted-foreground">{member.role.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {myShifts.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Your upcoming shifts</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {myShifts.map((shift) => {
                  const start = new Date(shift.startsAt);
                  const end = new Date(shift.endsAt);
                  const isToday = start.toDateString() === new Date().toDateString();
                  return (
                    <div key={shift.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2 gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {isToday ? "Today" : start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–{end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          {shift.storeName ? ` · ${shift.storeName}` : ""}
                        </p>
                      </div>
                      {isToday && <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Today</span>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Quick log</p>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((quick) => (
              <button
                key={quick.action}
                onClick={() => handleQuickAction(quick.action, quick.label)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-4 hover:border-primary/40 hover:bg-card transition-colors"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${quick.color}`}><quick.icon className="h-4 w-4" /></div>
                <span className="text-xs font-medium text-center leading-tight">{quick.label}</span>
              </button>
            ))}
          </div>
        </div>

        {recentSales.length > 0 && (
          <Card>
            <CardContent className="pt-4 sm:pt-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> Your receipts this shift</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {recentSales.map((sale) => (
                  <button
                    key={sale.id}
                    onClick={() => setReceipt(sale)}
                    className="w-full flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2 gap-2 hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{sale.receiptNumber}</span>
                      {isSalePending(sale) && <span className="block text-[11px] text-amber-600">Waiting to upload</span>}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{currency} {sale.total.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4 sm:pt-6 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Today's activity</p>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nothing logged yet — ring up a sale or use the quick actions above.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {activity.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2 gap-2">
                    <span className="truncate">{entry.description}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {scanFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-100 text-white text-sm px-4 py-2 rounded-full shadow-lg ${scanFeedback.type === "success" ? "bg-emerald-500" : "bg-destructive"}`}
          >
            {scanFeedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={saleOpen} onOpenChange={setSaleOpen}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> New Sale</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pt-2">
            <OfflineBanner
              online={online}
              syncing={syncing}
              pendingCount={pending.length}
              failedCount={failed.length}
              foreignCount={0}
              sessionExpired={sessionExpired}
              catalogSavedAt={catalogSavedAt}
            />

            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  placeholder="Scan a barcode, or type it and press Enter..."
                  value={scanBarcodeInput}
                  onChange={(event) => setScanBarcodeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && scanBarcodeInput.trim()) {
                      event.preventDefault();
                      void handleBarcodeScan(scanBarcodeInput.trim());
                    }
                  }}
                  className="pl-10 sm:pl-11 h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 shrink-0" onClick={() => setCameraScannerOpen(true)}>
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name..."
                value={productSearchQuery}
                onChange={(event) => setProductSearchQuery(event.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {productSearchQuery && (
                <button onClick={() => setProductSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {filteredProducts.map((product) => {
                const inCart = cartQtyFor(product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    disabled={product.stock <= 0}
                    className="relative text-left rounded-xl border border-border/60 bg-card/60 p-3 hover:border-primary/40 hover:bg-card transition-colors disabled:opacity-40"
                  >
                    {inCart > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full gradient-bg text-white text-[10px] font-bold flex items-center justify-center">{inCart}</span>
                    )}
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{currency} {product.price}</p>
                    <p className={`text-[10px] mt-0.5 ${product.stock <= product.lowStockAt ? "text-amber-500" : "text-muted-foreground"}`}>{product.stock} left</p>
                  </button>
                );
              })}
              {catalogLoading && products.length === 0 && <p className="col-span-2 text-sm text-muted-foreground text-center py-4">Loading products…</p>}
              {!catalogLoading && products.length === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground text-center py-4">{catalogError ?? "No products available."}</p>
              )}
              {products.length > 0 && filteredProducts.length === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground text-center py-4">No products match "{productSearchQuery}"</p>
              )}
            </div>

            {cart.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate flex-1">{item.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => adjustQty(item.productId, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-5 text-center text-xs">{item.quantity}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => adjustQty(item.productId, 1)}><Plus className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeItem(item.productId)}><X className="h-3 w-3" /></Button>
                    </div>
                    <span className="w-16 text-right text-xs shrink-0">{currency} {(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <select
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                value={customerId}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  setRedeemPoints(0);
                }}
              >
                <option value="">Walk-in customer</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
              <select
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method.replace("_", " ")}</option>)}
              </select>
            </div>
          </div>

          {online && selectedCustomer && maxRedeemable > 0 && (
            <div className="pt-2 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Redeem points</span>
                <span className="text-muted-foreground">{selectedCustomer.loyaltyPoints} available</span>
              </div>
              <Input
                type="number"
                min={0}
                max={maxRedeemable}
                className="h-9 text-sm"
                value={redeemPoints || ""}
                onChange={(event) => setRedeemPoints(Math.max(0, Math.min(maxRedeemable, Number(event.target.value) || 0)))}
                placeholder="0"
              />
              {redeem > 0 && <p className="text-xs text-emerald-600">{redeem} points = {currency} {discount.toLocaleString()} off</p>}
            </div>
          )}

          {!online && selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
            <p className="pt-2 border-t border-border text-xs text-amber-600">
              Points can't be redeemed while offline. {selectedCustomer.name} still earns points when this sale uploads.
            </p>
          )}

          <div className="pt-3 border-t border-border shrink-0 space-y-2">
            {discount > 0 && (
              <p className="text-xs text-right text-emerald-600">Loyalty discount: -{currency} {discount.toFixed(2)}</p>
            )}
            <p className="text-lg font-bold text-right">Total: {currency} {total.toFixed(2)}</p>
            <Button className="w-full" onClick={handleCheckout} disabled={cart.length === 0 || checkingOut}>
              {checkingOut ? "Processing..." : online ? "Complete sale" : "Complete sale · save offline"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Receipt</DialogTitle></DialogHeader>
          {receipt && (
            <>
              {isSalePending(receipt) && (
                <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-600">
                  <CloudOff className="h-3.5 w-3.5 shrink-0" /> Saved on this PC. It uploads automatically when the connection returns.
                </div>
              )}
              <div className="space-y-3 pt-1 text-sm">
                <div className="text-center space-y-0.5">
                  <p className="font-semibold">{businessName}</p>
                  <p className="text-[11px] text-muted-foreground">{receipt.receiptNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(receipt.createdAt).toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">{receipt.customerName ?? "Walk-in customer"}</p>
                </div>
                <div className="border-t border-dashed border-border pt-2 space-y-1.5">
                  {receipt.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="truncate">{item.name}</p>
                        <p className="text-muted-foreground">{item.quantity} × {currency} {item.unitPrice.toLocaleString()}</p>
                      </div>
                      <span className="shrink-0 font-medium">{currency} {item.lineTotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                {receipt.discount > 0 && (
                  <div className="border-t border-dashed border-border pt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Discount</span><span>-{currency} {receipt.discount.toLocaleString()}</span>
                  </div>
                )}
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

      <PendingSalesDialog
        open={queueOpen}
        onOpenChange={setQueueOpen}
        entries={entries}
        online={online}
        syncing={syncing}
        currency={currency}
        onSyncNow={() => void syncNow()}
        onRetry={(id) => void retry(id)}
        onDiscard={(id) => void discard(id)}
        onView={(sale) => {
          setQueueOpen(false);
          setReceipt(sale);
        }}
      />

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add a note</DialogTitle></DialogHeader>
          <form onSubmit={handleNoteSubmit} className="space-y-3 pt-2">
            <Textarea rows={3} placeholder="What happened?" value={note} onChange={(event) => setNote(event.target.value)} autoFocus />
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
            {pending.length + failed.length > 0 && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600">
                {pending.length + failed.length} sale{pending.length + failed.length === 1 ? " is" : "s are"} still saved on this PC. They stay safe and upload after you sign in again on this PC.
              </p>
            )}
            {!online && (
              <p className="text-xs text-muted-foreground">You're offline. Clock-out needs a connection.</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setClockOutConfirm(false)}>Stay clocked in</Button>
              <Button variant="destructive" className="flex-1" onClick={handleConfirmClockOut} disabled={clockingOut || !online}>
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
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-100 text-white text-sm px-4 py-2 rounded-full shadow-lg ${toast.type === "success" ? "bg-emerald-500" : "bg-destructive"}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <PrintArea text={receipt ? buildReceiptText(receipt, businessName, currency, staff.name) : null} />

      <CameraBarcodeScanner
        open={cameraScannerOpen}
        onOpenChange={setCameraScannerOpen}
        onDetect={(code) => {
          setCameraScannerOpen(false);
          void handleBarcodeScan(code);
        }}
      />
    </div>
  );
}