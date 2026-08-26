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
  Search,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Target,
  Clock,
  Zap,
  X,
  RotateCcw,
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
} from "@/lib/hooks/use-life-data";
import type { BizExpense, BizProduct, BizSale, BusinessActivity } from "@/types/life";
import { cn } from "@/lib/utils";
import { DashboardRangeSelector, type DashboardRangeValue } from "@/components/merchant/dashboard-range-selector";

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
  const [rangeValue, setRangeValue] = useState<DashboardRangeValue>({ mode: "preset", range: "today" });
  const rangePreset = rangeValue.mode === "preset" ? rangeValue.range : "month";
  const supportedRangePreset = rangePreset === "year" ? "month" : rangePreset;
  const rangeLabel =
    rangeValue.mode === "preset"
      ? rangeValue.range
      : `${rangeValue.from.toLocaleDateString()} – ${rangeValue.to.toLocaleDateString()}`;
  const { data: dash, isLoading, isError, error } = useBusinessDashboard(rangeValue);
  const { data: products } = useBizProducts(true);
  const { data: customers } = useBizCustomers();
  const { data: expenses } = useBizExpenses("month");
  const { data: expensesForRange } = useBizExpenses(supportedRangePreset);
  const { data: sales } = useBizSales(supportedRangePreset);

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
  const [productSearchQuery, setProductSearchQuery] = useState("");

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const currency = dash?.currency ?? "NGN";

  const filteredProducts = productSearchQuery
    ? (products ?? []).filter((p) => p.name.toLowerCase().includes(productSearchQuery.toLowerCase()))
    : products ?? [];

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

  const metric = (id: string) => (dash?.metrics ?? []).find((m: { id: string }) => m.id === id);

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
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{dash.businessName}</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">Point of Sale Dashboard</p>
            </div>
          </div>
        </div>
        {/* <Tabs value={range} onValueChange={(v) => setRange(v as any)} className="bg-muted/50 p-1 rounded-lg">
          <TabsList className="bg-transparent h-9">
            <TabsTrigger value="today" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Today</TabsTrigger>
            <TabsTrigger value="week" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Week</TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Month</TabsTrigger>
          </TabsList>
        </Tabs> */}
        <DashboardRangeSelector value={rangeValue} onChange={setRangeValue} />
      </motion.div>

      {/* Stats row */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { id: "revenue", icon: DollarSign, color: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20", textColor: "text-emerald-700", bgColor: "bg-emerald-500" },
          { id: "orders", icon: Receipt, color: "from-blue-500/10 to-blue-600/5 border-blue-500/20", textColor: "text-blue-700", bgColor: "bg-blue-500" },
          { id: "customers", icon: Users, color: "from-purple-500/10 to-purple-600/5 border-purple-500/20", textColor: "text-purple-700", bgColor: "bg-purple-500" },
          { id: "profit", icon: BarChart3, color: "from-amber-500/10 to-amber-600/5 border-amber-500/20", textColor: "text-amber-700", bgColor: "bg-amber-500" },
        ].map(({ id, icon: Icon, color, textColor, bgColor }) => {
          const m = metric(id);
          const negative = m?.change?.startsWith("-");
          return (
            <motion.div
              key={id}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card className={`bg-gradient-to-br ${color} hover:shadow-lg transition-all duration-300 overflow-hidden relative group`}>
                <div className={`absolute top-0 right-0 w-20 h-20 ${bgColor}/5 roundedfull blur-2xl group-hover:${bgColor}/10 transition-all duration-300`} />
                <CardHeader className="pb-2 flex items-center justify-between relative z-10">
                  <CardTitle className={`text-[10px] sm:text-xs font-medium ${textColor}`}>{m?.label ?? id}</CardTitle>
                  <motion.div 
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className={`p-1.5 sm:p-2 rounded-xl bg-white/60 group-hover:bg-white/80 transition-all duration-300 shadow-sm`}
                  >
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${textColor}`} />
                  </motion.div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <motion.p 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl sm:text-2xl font-bold"
                  >
                    {m?.value ?? "—"}
                  </motion.p>
                  {m?.change && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className={cn(
                        "text-[11px] mt-2 flex items-center gap-1 font-medium",
                        negative ? "text-red-600" : "text-emerald-600"
                      )}
                    >
                      {negative ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                      {m.change}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {lowStock.length > 0 && (
        <motion.div variants={item} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent animate-pulse" />
            <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 relative z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <motion.div 
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  className="p-1.5 sm:p-2 bg-amber-500/20 rounded-xl shadow-sm"
                >
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                </motion.div>
                <div>
                  <p className="font-semibold text-amber-900 text-xs sm:text-sm">Low Stock Alert</p>
                  <p className="text-[10px] sm:text-xs text-amber-700 mt-0.5">
                    {lowStock.length} product{lowStock.length > 1 ? 's' : ''} need restocking
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="border-amber-500/30 text-amber-700 hover:bg-amber-500/10 h-8 sm:h-9 text-xs shadow-sm hover:shadow transition-all duration-200" 
                onClick={() => setTab("products")}
              >
                View Products
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-4 w-full bg-muted/50 p-1 rounded-xl h-10 sm:h-12 shadow-sm">
            <TabsTrigger value="sell" className="data-[state=active]:bg-background data-[state=active]:shadow-md gap-1.5 sm:gap-2 text-xs sm:text-sm rounded-lg transition-all duration-200">
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Sell
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-background data-[state=active]:shadow-md gap-1.5 sm:gap-2 text-xs sm:text-sm rounded-lg transition-all duration-200">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Products
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-background data-[state=active]:shadow-md gap-1.5 sm:gap-2 text-xs sm:text-sm rounded-lg transition-all duration-200">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Customers
            </TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-background data-[state=active]:shadow-md gap-1.5 sm:gap-2 text-xs sm:text-sm rounded-lg transition-all duration-200">
              <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Expenses
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {tab === "sell" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                    <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" /> Product Catalog
                  </CardTitle>
                  {productSearchQuery && (
                    <Button size="sm" variant="ghost" onClick={() => setProductSearchQuery("")} className="h-7 sm:h-8 text-[10px] sm:text-xs">
                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" /> Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                  />
                </div>
                {!products || products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No products yet — add one from the Products tab to start selling.
                    </p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No products match "{productSearchQuery}"
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {filteredProducts.map((p, index) => (
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
                    Shopping Cart
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
                      {cart.map((l, index) => (
                        <motion.div 
                          key={`${l.productId}-${l.name}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/20 transition-all duration-200"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium truncate">{l.name}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{currency} {l.unitPrice.toLocaleString()} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 sm:h-7 sm:w-7"
                                onClick={() => updateQty(l.productId, l.name, -1)}
                              >
                                <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </Button>
                            </motion.div>
                            <motion.span 
                              key={l.quantity}
                              initial={{ scale: 1.2 }}
                              animate={{ scale: 1 }}
                              className="w-5 sm:w-6 text-center text-xs sm:text-sm font-bold"
                            >
                              {l.quantity}
                            </motion.span>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 sm:h-7 sm:w-7"
                                onClick={() => updateQty(l.productId, l.name, 1)}
                              >
                                <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </Button>
                            </motion.div>
                          </div>
                          <div className="text-right min-w-[50px] sm:min-w-[70px]">
                            <p className="text-xs sm:text-sm font-semibold">{currency} {(l.unitPrice * l.quantity).toLocaleString()}</p>
                          </div>
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
                            {(customers ?? []).map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
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
                              <SelectItem value="CASH">Cash</SelectItem>
                              <SelectItem value="CARD">Card</SelectItem>
                              <SelectItem value="TRANSFER">Transfer</SelectItem>
                              <SelectItem value="MOBILE_MONEY">Mobile money</SelectItem>
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
                      className="w-full"
                    >
                      <Button 
                        className="w-full h-10 sm:h-11 text-sm sm:text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300" 
                        disabled={cart.length === 0 || createSale.isPending} 
                        onClick={handleCheckout}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
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
                            Complete Sale
                          </span>
                        )}
                      </Button>
                    </motion.div>

                    {lastSale && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-[10px] sm:text-xs h-8 sm:h-9"
                        onClick={() => setReceiptOpen(true)}
                      >
                        <Receipt className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                        View last receipt · {lastSale.receiptNumber}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {tab === "products" && (
        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Products
                </CardTitle>
                <Button size="sm" onClick={() => setProductDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(!products || products.length === 0) ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No products yet.</p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={() => setProductDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add your first product
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(products ?? []).map((p) => (
                    <div key={p.id} className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{p.name}</p>
                          {p.category && (
                            <p className="text-xs text-muted-foreground capitalize mt-0.5">{p.category}</p>
                          )}
                        </div>
                        {p.stock <= p.lowStockAt && p.stock > 0 && (
                          <Badge variant="warning" className="text-[9px] px-1.5 py-0 h-4 shrink-0">Low</Badge>
                        )}
                        {p.stock <= 0 && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 shrink-0">Out</Badge>
                        )}
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Price</span>
                          <span className="font-semibold">{currency} {p.price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Stock</span>
                          <span className={cn("font-medium", p.stock <= 0 ? "text-destructive" : p.stock <= p.lowStockAt ? "text-amber-600" : "")}>
                            {p.stock}
                          </span>
                        </div>
                        {p.margin != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Margin</span>
                            <span className="text-xs font-medium text-emerald-600">{p.margin}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => openEditProduct(p)}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Remove "${p.name}" from your catalog?`)) {
                              deleteProduct.mutate(p.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "customers" && (
        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Customers
                </CardTitle>
                <Button size="sm" onClick={() => setCustomerDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Customer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(!customers || customers.length === 0) ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No customers yet.</p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={() => setCustomerDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add your first customer
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(customers ?? []).map((c) => (
                    <div key={c.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.phone ?? c.email ?? "No contact on file"}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{c.orderCount} order{c.orderCount !== 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Total spent</span>
                          <span className="font-semibold text-primary">{currency} {c.totalSpent.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "expenses" && (
        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" /> Expenses
                </CardTitle>
                <Button size="sm" onClick={() => setExpenseDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Log Expense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(!expenses || expenses.length === 0) ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No expenses logged this month.</p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={() => setExpenseDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Log your first expense
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {(expenses ?? []).map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{e.title}</p>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 capitalize">{e.category.toLowerCase()}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(e.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-destructive">{currency} {e.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-4 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[11px]">
                  {dash.recentActivity.length} items
                </Badge>
                {dash.recentActivity.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs px-2"
                    onClick={() => setActivityDialogOpen(true)}
                  >
                    View all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {dash.recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Sales and expenses will show up here.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-80">
                  <div className="space-y-2 pt-1">
                    {dash.recentActivity.map((a: BusinessActivity) => (
                      <button
                        key={a.id}
                        onClick={() => openActivityDetail(a)}
                        className="w-full flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-3 text-left hover:border-primary/30 hover:bg-card transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            {activityIcon(a.type)}
                          </div>
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
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">{dash.insight}</CardContent>
          </Card>
          {dash.topProducts.length > 0 && (
            <Card className="hover:border-primary/20 transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Top Sellers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dash.topProducts.map((p: { name: string; units: number }, i: number) => (
                  <div key={p.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{p.units} sold</span>
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
            <DialogTitle>All activity · {rangeLabel}</DialogTitle>
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
