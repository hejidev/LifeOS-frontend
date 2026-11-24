"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Banknote, Bell, CheckCircle2, Eye, FileText, MessageSquare, Package, ShoppingCart, Wallet, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, HourBars, MixBar, Pill, Tile, money, when } from "@/components/merchant/ops-ui";
import { useBusinessAnalytics } from "@/lib/hooks/use-life-data";
import { dateKey, useAttention, useDailyReport, useOverview, useRegisterCurrent } from "@/lib/hooks/use-merchant-ops";
import type { Range } from "@/lib/hooks/use-merchant-ops";
import { usePaymentSummary } from "@/lib/hooks/use-payment-confirmation";

type Period = "today" | "week" | "month" | "year";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAX_DAILY_BARS = 62;

interface Analytics {
  summary: { totalRevenue: number; orderCount: number; avgOrderValue: number };
  dailyTrend: { date: string; revenue: number }[];
  topProducts: { id?: string; name: string; unitsSold: number; revenue: number }[];
  customerRetention: { newCustomers: number; returningCustomers: number; repeatBuyers: number };
  deadStock: { id: string; name: string; stock: number }[];
}

interface Bucket {
  key: string;
  label: string;
  revenue: number;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function buildBuckets(points: Analytics["dailyTrend"]): { unit: "day" | "month"; buckets: Bucket[] } {
  if (points.length <= MAX_DAILY_BARS) {
    return {
      unit: "day",
      buckets: points.map((point) => {
        const [, month, day] = point.date.split("-").map(Number);
        return { key: point.date, label: `${day} ${MONTHS[month - 1]}`, revenue: point.revenue };
      }),
    };
  }
  const months = new Map<string, number>();
  for (const point of points) months.set(point.date.slice(0, 7), (months.get(point.date.slice(0, 7)) ?? 0) + point.revenue);
  return {
    unit: "month",
    buckets: [...months.entries()].map(([key, revenue]) => {
      const [year, month] = key.split("-").map(Number);
      return { key, label: `${MONTHS[month - 1]} ${year}`, revenue };
    }),
  };
}

function TrendBars({ buckets, currency }: { buckets: Bucket[]; currency: string }) {
  const peak = Math.max(...buckets.map((bucket) => bucket.revenue), 1);
  return (
    <div className="flex h-32 items-end gap-0.5 sm:h-40">
      {buckets.map((bucket) => (
        <div key={bucket.key} className="group flex h-full flex-1 items-end" title={`${bucket.label} · ${money(currency, bucket.revenue)}`}>
          <div className="w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(2, (bucket.revenue / peak) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function MerchantOverviewPage() {
  const [period, setPeriod] = useState<Period>("today");
  const today = dateKey(new Date());
  const isToday = period === "today";

  const analyticsQuery = useBusinessAnalytics(isToday ? { mode: "custom", from: today, to: today } : { mode: "preset", range: period as "week" | "month" | "year" });
  const overview = useOverview((period === "year" ? "month" : period) as Range);
  const attention = useAttention();
  const report = useDailyReport(today);
  const register = useRegisterCurrent();
  const payments = usePaymentSummary();

  const analytics = analyticsQuery.data as (Analytics & { currency?: string }) | undefined;
  const currency = analytics?.currency ?? overview.data?.currency ?? "NGN";
  const trend = useMemo(() => (analytics ? buildBuckets(analytics.dailyTrend) : null), [analytics]);
  const best = trend?.buckets.reduce<Bucket | null>((top, bucket) => (!top || bucket.revenue > top.revenue ? bucket : top), null) ?? null;
  const topRevenue = Math.max(...(analytics?.topProducts.map((product) => product.revenue) ?? [1]), 1);
  const net = overview.data?.metrics.find((metric) => metric.id === "profit");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const businessName = overview.data?.businessName;

  const baseRows = attention.data
    ? [
        { href: "/merchant/products", icon: Package, tint: "text-amber-500", label: plural(attention.data.lowStock, "product is running low", "products are running low"), count: attention.data.lowStock },
        { href: "/merchant/sales?view=review", icon: Eye, tint: "text-destructive", label: plural(attention.data.needsReview, "sale needs review", "sales need review"), count: attention.data.needsReview },
        { href: "/merchant/receivables", icon: Wallet, tint: "text-destructive", label: `${money(currency, attention.data.owedTotal)} unpaid across ${plural(attention.data.owedCount, "sale", "sales")}`, count: attention.data.owedCount },
        { href: "/merchant/chat", icon: MessageSquare, tint: "text-primary", label: plural(attention.data.unreadChat, "unread message", "unread messages"), count: attention.data.unreadChat },
        { href: "/merchant/notifications", icon: Bell, tint: "text-sky-500", label: plural(attention.data.unreadNotifications, "unread alert", "unread alerts"), count: attention.data.unreadNotifications },
      ].filter((row) => row.count > 0)
    : [];

    const owedPayments = payments.data ? payments.data.awaitingCount + payments.data.disputedCount : 0;
    const rows = [
      ...(owedPayments > 0 && payments.data
        ? [{ href: "/merchant/payments", icon: ShieldCheck, tint: "text-amber-500", label: `${money(currency, payments.data.awaitingTotal + payments.data.disputedTotal)} awaiting confirmation across ${plural(owedPayments, "payment", "payments")}`, count: owedPayments }]
        : []),
      ...baseRows,
    ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{greeting}{businessName ? `, ${businessName}` : ""}</h1>
            <p className="text-sm text-muted-foreground">Here's how your business is doing.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link href="/merchant/reports"><FileText className="mr-1.5 h-4 w-4" /> Daily report</Link></Button>
            <Button asChild size="sm"><Link href="/merchant/pos"><ShoppingCart className="mr-1.5 h-4 w-4" /> New sale</Link></Button>
          </div>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <TabsList className="w-max">
              {PERIODS.map((item) => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              {rows.length > 0 ? <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> : null}
              Needs your attention
            </p>
            {!attention.data ? (
              <Skeleton className="h-20 w-full" />
            ) : rows.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-5 w-5" /> All clear. Nothing needs you right now.</div>
            ) : (
              <div className="divide-y">
                {rows.map((row) => (
                  <Link key={row.href} href={row.href} className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:text-primary">
                    <row.icon className={`h-4 w-4 shrink-0 ${row.tint}`} />
                    <span className="flex-1 font-medium">{row.label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Banknote className="h-4 w-4 text-primary" /> Cash register</p>
            {register.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : register.data ? (
              <>
                <Pill tone="success">Open</Pill>
                <p className="text-2xl font-bold">{money(currency, register.data.cash.expected)}</p>
                <p className="text-xs text-muted-foreground">Expected in the drawer · opened {when(register.data.openedAt)} by {register.data.openedByName}</p>
              </>
            ) : (
              <>
                <Pill>Closed</Pill>
                <p className="text-sm text-muted-foreground">No register is open at this location.</p>
              </>
            )}
            <Button asChild variant="outline" size="sm" className="w-full"><Link href="/merchant/register">{register.data ? "Manage register" : "Open register"}</Link></Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Revenue · {PERIODS.find((item) => item.value === period)?.label.toLowerCase()}</p>
              {analytics ? <p className="truncate text-3xl font-bold tracking-tight sm:text-4xl">{money(currency, analytics.summary.totalRevenue)}</p> : <Skeleton className="mt-1 h-10 w-48" />}
            </div>
            {isToday ? (
              report.data && report.data.summary.orders > 0 ? <HourBars hourly={report.data.hourly} /> : <Empty>No sales yet today.</Empty>
            ) : !trend ? (
              <Skeleton className="h-40 w-full" />
            ) : trend.buckets.length > 1 ? (
              <>
                <TrendBars buckets={trend.buckets} currency={currency} />
                <p className="text-xs text-muted-foreground">{best && best.revenue > 0 ? `Best ${trend.unit}: ${best.label} · ${money(currency, best.revenue)}` : "No sales in this period yet."}</p>
              </>
            ) : (
              <Empty>Not enough days to draw a trend yet.</Empty>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          {analytics ? (
            <>
              <Tile label="Orders" value={String(analytics.summary.orderCount)} />
              <Tile label="Average order" value={money(currency, analytics.summary.avgOrderValue)} />
              {net && period !== "year" ? <Tile label="Net after expenses" value={net.value.replace(/^[A-Z]{3}\s/, `${currency} `)} hint={net.change} /> : null}
            </>
          ) : (
            Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24" />)
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Top products</p>
            {!analytics ? (
              <Skeleton className="h-24 w-full" />
            ) : analytics.topProducts.length === 0 ? (
              <Empty>No sales in this period.</Empty>
            ) : (
              analytics.topProducts.slice(0, 6).map((product, index) => (
                <div key={product.id ?? `${product.name}-${index}`} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{product.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{product.unitsSold} sold</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(4, (product.revenue / topRevenue) * 100)}%` }} /></div>
                  <p className="text-[11px] text-muted-foreground">{money(currency, product.revenue)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold"><AlertCircle className="h-4 w-4 text-amber-500" /> Low stock</p>
              <Link href="/merchant/products" className="text-xs text-primary hover:underline">View products</Link>
            </div>
            {!overview.data ? (
              <Skeleton className="h-24 w-full" />
            ) : overview.data.lowStockProducts.length === 0 ? (
              <Empty>Everything is well stocked.</Empty>
            ) : (
              overview.data.lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{product.name}</span>
                  <Pill tone={product.stock <= 0 ? "danger" : "warning"}>{product.stock <= 0 ? "Out" : `${product.stock} left`}</Pill>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Recent activity</p>
              <Link href="/merchant/sales" className="text-xs text-primary hover:underline">All sales</Link>
            </div>
            {!overview.data ? (
              <Skeleton className="h-24 w-full" />
            ) : overview.data.recentActivity.length === 0 ? (
              <Empty>Nothing yet.</Empty>
            ) : (
              overview.data.recentActivity.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{when(item.date)}</p>
                  </div>
                  <span className={item.type === "expense" ? "shrink-0 text-destructive" : "shrink-0 font-medium"}>{item.type === "expense" ? "-" : ""}{money(item.currency, item.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Customers</p>
            {!analytics ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["New", analytics.customerRetention.newCustomers], ["Returning", analytics.customerRetention.returningCustomers], ["Repeat buyers", analytics.customerRetention.repeatBuyers]].map(([label, value]) => (
                  <div key={label} className="rounded-lg border p-3"><p className="text-xl font-bold">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">In stock but not selling</p>
            {!analytics ? (
              <Skeleton className="h-16 w-full" />
            ) : analytics.deadStock.length === 0 ? (
              <Empty>Everything is moving.</Empty>
            ) : (
              analytics.deadStock.slice(0, 6).map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{product.name}</span><span className="shrink-0 text-xs text-muted-foreground">{product.stock} in stock</span></div>
              ))
            )}
          </CardContent>
        </Card>

        {isToday ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-semibold">How customers paid · today</p>
              {report.data ? <MixBar rows={report.data.byPayment} currency={currency} /> : <Skeleton className="h-24 w-full" />}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {overview.data?.insight ? <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{overview.data.insight}</p> : null}
    </div>
  );
}