//app/(app)/app/small-bussiness

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  CreditCard,
  Package,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  Pencil,
  AlertTriangle,
  ShoppingCart,
  Download,
  Printer,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  useBusinessDashboard,
  useBizProducts,
  useCreateBizProduct,
  useUpdateBizProduct,
  useDeleteBizProduct,
  useBizCustomers,
  useCreateBizCustomer,
  useCreateBizSale,
  useBizExpenses,
  useCreateBizExpense,
  useDeleteBizExpense,
  useBizSales,
  useBusinessProducts,
  useBusinessSales,
  useBusinessExpenses
} from "@/lib/hooks/use-life-data";
import type { BizExpense, BizProduct, BizSale, BusinessActivity } from "@/types/life";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

type CartLine = { productId?: string; name: string; unitPrice: number; quantity: number };

function buildReceiptText(sale: BizSale, businessName: string, currency: string) {
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
    ...sale.items.flatMap((it) => [
      it.name,
      line(`  ${it.quantity} x ${currency} ${it.unitPrice.toLocaleString()}`, `${currency} ${it.lineTotal.toLocaleString()}`),
    ]),
    "-".repeat(42),
    line("Subtotal", `${currency} ${sale.subtotal.toLocaleString()}`),
    line("Discount", `${currency} ${sale.discount.toLocaleString()}`),
    line("Total", `${currency} ${sale.total.toLocaleString()}`),
    "",
    `Payment: ${sale.paymentMethod.replace("_", " ")}`,
    `Status: ${sale.status}`,
    sale.note ? `Note: ${sale.note}` : "",
    "",
    "Thank you for your business!",
  ];

  return rows.filter((r) => r !== undefined).join("\n");
}

function downloadReceipt(sale: BizSale, businessName: string, currency: string) {
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

function activityIcon(type: BusinessActivity["type"]) {
  switch (type) {
    case "invoice":
      return <Receipt className="h-4 w-4 text-primary" />;
    case "order":
      return <TrendingUp className="h-4 w-4 text-primary" />;
    case "expense":
      return <CreditCard className="h-4 w-4 text-primary" />;
    default:
      return <Users className="h-4 w-4 text-primary" />;
  }
}

export default function MerchantDashboardPage() {
  const [range, setRange] = useState<"today" | "week" | "month">("today");
  const { data: dash, isLoading, isError, error } = useBusinessDashboard(range);
  const { data: products } = useBizProducts(true);
  const { data: customers } = useBizCustomers();
  const { data: expenses } = useBizExpenses("month");
  const { data: expensesForRange } = useBizExpenses(range);
  const { data: sales } = useBizSales(range);

  const createProduct = useCreateBizProduct();
  const updateProduct = useUpdateBizProduct();
  const deleteProduct = useDeleteBizProduct();
  const createCustomer = useCreateBizCustomer();
  const createSale = useCreateBizSale();
  const createExpense = useCreateBizExpense();
  const deleteExpense = useDeleteBizExpense();

  const [tab, setTab] = useState<"sell" | "products" | "customers" | "expenses">("sell");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [lastSale, setLastSale] = useState<BizSale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: 0, stock: 0, category: "" });

  const [editingProduct, setEditingProduct] = useState<BizProduct | null>(null);
  const [editProductForm, setEditProductForm] = useState({
    name: "",
    price: 0,
    stock: 0,
    lowStockAt: 3,
    category: "",
  });

  const openEditProduct = (p: BizProduct) => {
    setEditingProduct(p);
    setEditProductForm({
      name: p.name,
      price: p.price,
      stock: p.stock,
      lowStockAt: p.lowStockAt,
      category: p.category ?? "",
    });
  };

  const saveEditedProduct = () => {
    if (!editingProduct) return;
    updateProduct.mutate(
      { id: editingProduct.id, data: editProductForm },
      { onSuccess: () => setEditingProduct(null) }
    );
  };

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: "", amount: 0, category: "OTHER" });

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const currency = dash?.currency ?? "NGN";

  const addToCart = (p: BizProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId: p.id, name: p.name, unitPrice: p.price, quantity: 1 }];
    });
  };

  const updateQty = (productId: string | undefined, name: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId && l.name === name ? { ...l, quantity: l.quantity + delta } : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    createSale.mutate(
      {
        customerId,
        items: cart.map(({ productId, name, unitPrice, quantity }) => ({ productId, name, unitPrice, quantity })),
        discount,
        paymentMethod,
        status: "PAID",
      },
      {
        onSuccess: (sale: BizSale) => {
          setLastSale(sale);
          setReceiptOpen(true);
          setCart([]);
          setDiscount(0);
          setCustomerId(undefined);
        },
      }
    );
  };

  const lowStock = dash?.lowStockProducts ?? [];

  const metric = (id: string) => dash?.metrics.find((m) => m.id === id);

  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<BizExpense | null>(null);

  const openActivityDetail = (a: { id: string; type: BusinessActivity["type"] }) => {
    if (a.type === "order" || a.type === "invoice") {
      const match = sales?.find((s) => s.id === a.id);
      if (match) {
        setLastSale(match);
        setReceiptOpen(true);
        return;
      }
    }
    if (a.type === "expense") {
      const match = (expensesForRange ?? expenses)?.find((e) => e.id === a.id);
      if (match) setSelectedExpense(match);
    }
  };

  const allActivity = useMemo(() => {
    const fromSales = (sales ?? []).map((s) => ({
      id: s.id,
      title: s.customerName ? `Sale to ${s.customerName}` : `Sale ${s.receiptNumber}`,
      type: "order" as const,
      amount: s.total,
      currency,
      date: s.createdAt,
      status: s.status,
    }));
    const fromExpenses = (expensesForRange ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      type: "expense" as const,
      amount: e.amount,
      currency,
      date: e.date,
      status: undefined,
    }));
    return [...fromSales, ...fromExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [sales, expensesForRange, currency]);

  if (isLoading) {
    return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;
  }
  
  if (isError || !dash) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-3 text-center px-4">
        <p className="text-sm font-medium">
          {(error as any)?.message ?? "Couldn't load your dashboard."}
        </p>
        <p className="text-xs text-muted-foreground">
          If you recently subscribed, this can take a minute to activate — try refreshing.
        </p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {dash.businessName} POS
          </h1>
          <p className="text-muted-foreground mt-1">
            Sell, restock, and track the money — all synced live
          </p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: "revenue", icon: TrendingUp },
          { id: "orders", icon: Receipt },
          { id: "customers", icon: Users },
          { id: "profit", icon: CreditCard },
        ].map(({ id, icon: Icon }) => {
          const m = metric(id);
          const negative = m?.change?.startsWith("-");
          return (
            <Card key={id} className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-2 flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground">{m?.label ?? id}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{m?.value ?? "—"}</p>
                {m?.change && (
                  <p
                    className={cn(
                      "text-[11px] mt-1 flex items-center gap-1",
                      negative ? "text-destructive" : "text-emerald-500"
                    )}
                  >
                    {negative ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {m.change}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {lowStock.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-3 flex items-center gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <span>
                Low stock: {lowStock.map((p) => `${p.name} (${p.stock} left)`).join(", ")}
              </span>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="sell">Sell</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {tab === "sell" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Catalog
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!products || products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No products yet — add one from the Products tab to start selling.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        disabled={p.stock <= 0}
                        className="text-left rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <p className="text-sm font-medium truncate">{p.name}</p>

                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Price
                          </span>
                          <span className="font-semibold">
                            {currency} {p.price.toLocaleString()}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Stock
                          </span>
                          <Badge
                            variant={p.stock <= 0 ? "destructive" : p.stock <= p.lowStockAt ? "warning" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="hover:border-primary/20 transition-colors sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" /> Cart
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tap a product to add it here.</p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((l) => (
                      <div key={`${l.productId}-${l.name}`} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate flex-1">{l.name}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQty(l.productId, l.name, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-5 text-center">{l.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQty(l.productId, l.name, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="w-16 text-right">
                          {currency} {(l.unitPrice * l.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Customer (optional)</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Walk-in customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {(customers ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Discount</Label>
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Payment</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                          <SelectItem value="TRANSFER">Transfer</SelectItem>
                          <SelectItem value="MOBILE_MONEY">Mobile money</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm font-semibold">
                  <span>Total</span>
                  <span>
                    {currency} {total.toLocaleString()}
                  </span>
                </div>

                <Button className="w-full" disabled={cart.length === 0 || createSale.isPending} onClick={handleCheckout}>
                  {createSale.isPending ? "Processing..." : "Complete sale"}
                </Button>

                {lastSale && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setReceiptOpen(true)}
                  >
                    <Receipt className="mr-1.5 h-3.5 w-3.5" />
                    View last receipt · {lastSale.receiptNumber}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {tab === "products" && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base">Products</CardTitle>
              <Button size="sm" onClick={() => setProductDialogOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add product
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 grid grid-cols-1 md:grid-cols-4 gap-5">
              {(products ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {currency} {p.price.toLocaleString()} · {p.stock} in stock
                      {p.margin != null ? ` · ${p.margin}% margin` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.stock <= p.lowStockAt && <Badge variant="warning">Low stock</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditProduct(p)}
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remove "${p.name}" from your catalog?`)) {
                          deleteProduct.mutate(p.id);
                        }
                      }}
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!products || products.length === 0) && (
                <p className="text-sm text-muted-foreground">No products yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "customers" && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base">Customers</CardTitle>
              <Button size="sm" onClick={() => setCustomerDialogOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add customer
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(customers ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone ?? c.email ?? "No contact on file"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currency} {c.totalSpent.toLocaleString()} · {c.orderCount} orders
                  </p>
                </div>
              ))}
              {(!customers || customers.length === 0) && (
                <p className="text-sm text-muted-foreground">No customers yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "expenses" && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base">Expenses this month</CardTitle>
              <Button size="sm" onClick={() => setExpenseDialogOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Log expense
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(expenses ?? []).map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {e.category.toLowerCase()} · {new Date(e.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    {currency} {e.amount.toLocaleString()}
                  </p>
                </div>
              ))}
              {(!expenses || expenses.length === 0) && (
                <p className="text-sm text-muted-foreground">No expenses logged this month.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Recent activity
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[11px]">
                  {dash.recentActivity.length} items
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setActivityDialogOpen(true)}
                >
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dash.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sales and expenses will show up here.</p>
              ) : (
                <ScrollArea className="max-h-70">
                  <div className="space-y-2 pt-1">
                    {dash.recentActivity.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => openActivityDetail(a)}
                        className="w-full flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-2 text-left hover:border-primary/30 hover:bg-card transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {activityIcon(a.type)}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{a.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {a.amount != null && a.currency ? `${a.currency} ${a.amount.toLocaleString()}` : ""}
                              {a.status ? ` · ${a.status}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">{new Date(a.date).toLocaleDateString()}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{dash.insight}</CardContent>
          </Card>
          {dash.topProducts.length > 0 && (
            <Card className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top sellers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dash.topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <span>{i + 1}. {p.name}</span>
                    <span className="text-muted-foreground">{p.units} sold</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>All activity · {range}</DialogTitle>
          </DialogHeader>
          {allActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No sales or expenses in this period yet.</p>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-2">
              <div className="space-y-2 pt-1">
                {allActivity.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setActivityDialogOpen(false);
                      openActivityDetail(a);
                    }}
                    className="w-full flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-2 text-left hover:border-primary/30 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {activityIcon(a.type)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.amount != null && a.currency ? `${a.currency} ${a.amount.toLocaleString()}` : ""}
                          {a.status ? ` · ${a.status.toLowerCase()}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {new Date(a.date).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Name" value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Price" value={newProduct.price} onChange={(e) => setNewProduct((p) => ({ ...p, price: Number(e.target.value) || 0 }))} />
              <Input type="number" placeholder="Stock" value={newProduct.stock} onChange={(e) => setNewProduct((p) => ({ ...p, stock: Number(e.target.value) || 0 }))} />
            </div>
            <Input placeholder="Category (optional)" value={newProduct.category} onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))} />
            <Button
              className="w-full"
              disabled={!newProduct.name.trim() || createProduct.isPending}
              onClick={() =>
                createProduct.mutate(newProduct as any, {
                  onSuccess: () => {
                    setNewProduct({ name: "", price: 0, stock: 0, category: "" });
                    setProductDialogOpen(false);
                  },
                })
              }
            >
              {createProduct.isPending ? "Adding..." : "Add product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={editProductForm.name}
                onChange={(e) => setEditProductForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  value={editProductForm.price}
                  onChange={(e) => setEditProductForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Stock</Label>
                <Input
                  type="number"
                  value={editProductForm.stock}
                  onChange={(e) => setEditProductForm((f) => ({ ...f, stock: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Low-stock alert threshold</Label>
              <Input
                type="number"
                value={editProductForm.lowStockAt}
                onChange={(e) => setEditProductForm((f) => ({ ...f, lowStockAt: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category (optional)</Label>
              <Input
                value={editProductForm.category}
                onChange={(e) => setEditProductForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button
                disabled={!editProductForm.name.trim() || updateProduct.isPending}
                onClick={saveEditedProduct}
              >
                {updateProduct.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Name" value={newCustomer.name} onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))} />
            <Input placeholder="Phone (optional)" value={newCustomer.phone} onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))} />
            <Button
              className="w-full"
              disabled={!newCustomer.name.trim() || createCustomer.isPending}
              onClick={() =>
                createCustomer.mutate(newCustomer, {
                  onSuccess: () => {
                    setNewCustomer({ name: "", phone: "" });
                    setCustomerDialogOpen(false);
                  },
                })
              }
            >
              {createCustomer.isPending ? "Adding..." : "Add customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Title" value={newExpense.title} onChange={(e) => setNewExpense((x) => ({ ...x, title: e.target.value }))} />
            <Input type="number" placeholder="Amount" value={newExpense.amount} onChange={(e) => setNewExpense((x) => ({ ...x, amount: Number(e.target.value) || 0 }))} />
            <Select value={newExpense.category} onValueChange={(v) => setNewExpense((x) => ({ ...x, category: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["INVENTORY", "RENT", "UTILITIES", "SALARY", "MARKETING", "SUPPLIES", "OTHER"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              disabled={!newExpense.title.trim() || newExpense.amount <= 0 || createExpense.isPending}
              onClick={() =>
                createExpense.mutate(newExpense, {
                  onSuccess: () => {
                    setNewExpense({ title: "", amount: 0, category: "OTHER" });
                    setExpenseDialogOpen(false);
                  },
                })
              }
            >
              {createExpense.isPending ? "Logging..." : "Log expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={receiptOpen && !!lastSale} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {lastSale && (
            <>
              <div id="receipt-print-area" className="space-y-3 pt-1 text-sm">
                <div className="text-center space-y-0.5">
                  <p className="font-semibold">{dash.businessName}</p>
                  <p className="text-[11px] text-muted-foreground">{lastSale.receiptNumber}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(lastSale.createdAt).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {lastSale.customerName ?? "Walk-in customer"}
                  </p>
                </div>

                <div className="border-t border-dashed border-border pt-2 space-y-1.5">
                  {lastSale.items.map((it) => (
                    <div key={it.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="truncate">{it.name}</p>
                        <p className="text-muted-foreground">
                          {it.quantity} × {currency} {it.unitPrice.toLocaleString()}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium">
                        {currency} {it.lineTotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-border pt-2 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{currency} {lastSale.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>{currency} {lastSale.discount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold pt-1">
                    <span>Total</span>
                    <span>{currency} {lastSale.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-border pt-2 text-[11px] text-muted-foreground space-y-0.5">
                  <p className="capitalize">Payment: {lastSale.paymentMethod.replace("_", " ").toLowerCase()}</p>
                  <p className="capitalize">Status: {lastSale.status.toLowerCase()}</p>
                  {lastSale.note && <p>Note: {lastSale.note}</p>}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => downloadReceipt(lastSale, dash.businessName, currency)}
                >
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

      <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Expense</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-3 pt-1 text-sm">
              <div>
                <p className="font-medium">{selectedExpense.title}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {selectedExpense.category.toLowerCase()}
                </p>
              </div>
              <div className="border-t border-dashed border-border pt-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-sm">
                    {currency} {selectedExpense.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(selectedExpense.date).toLocaleString()}</span>
                </div>
              </div>
              {selectedExpense.note && (
                <div className="border-t border-dashed border-border pt-2 text-xs">
                  <p className="text-muted-foreground mb-0.5">Note</p>
                  <p>{selectedExpense.note}</p>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  deleteExpense.mutate(selectedExpense.id);
                  setSelectedExpense(null);
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete expense
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area,
          #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            padding: 24px;
          }
        }
      `}</style>
    </motion.div>
  );
}
