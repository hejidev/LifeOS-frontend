"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Banknote, Bell, CheckCircle2, Eye, FileText, MessageSquare, Package, ShoppingCart, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, HourBars, MixBar, Pill, Tile, money, when } from "@/components/merchant/ops-ui";
import { dateKey, useAttention, useDailyReport, useOverview, useRegisterCurrent } from "@/lib/hooks/use-merchant-ops";
import type { Range } from "@/lib/hooks/use-merchant-ops";

const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default function MerchantOverviewPage() {
  const [range, setRange] = useState<Range>("today");
  const overview = useOverview(range);
  const attention = useAttention();
  const report = useDailyReport(dateKey(new Date()));
  const register = useRegisterCurrent();

  const data = overview.data;
  const currency = data?.currency ?? "NGN";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const rows = attention.data
    ? [
        { href: "/merchant/products", icon: Package, tint: "text-amber-500", label: plural(attention.data.lowStock, "product is running low", "products are running low"), count: attention.data.lowStock },
        { href: "/merchant/sales?view=review", icon: Eye, tint: "text-destructive", label: plural(attention.data.needsReview, "sale needs review", "sales need review"), count: attention.data.needsReview },
        { href: "/merchant/receivables", icon: Wallet, tint: "text-destructive", label: `${money(currency, attention.data.owedTotal)} unpaid across ${plural(attention.data.owedCount, "sale", "sales")}`, count: attention.data.owedCount },
        { href: "/merchant/chat", icon: MessageSquare, tint: "text-primary", label: plural(attention.data.unreadChat, "unread message", "unread messages"), count: attention.data.unreadChat },
        { href: "/merchant/notifications", icon: Bell, tint: "text-sky-500", label: plural(attention.data.unreadNotifications, "unread alert", "unread alerts"), count: attention.data.unreadNotifications },
      ].filter((row) => row.count > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}{data?.businessName ? `, ${data.businessName}` : ""}</h1>
          <p className="text-sm text-muted-foreground">Here's how your business is doing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={range} onValueChange={(value) => setRange(value as Range)}>
            <TabsList>
              {RANGES.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button asChild variant="outline" size="sm">
            <Link href="/merchant/reports"><FileText className="mr-1.5 h-4 w-4" /> Daily report</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/merchant/pos"><ShoppingCart className="mr-1.5 h-4 w-4" /> New sale</Link>
          </Button>
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
              <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" /> All clear. Nothing needs you right now.
              </div>
            ) : (
              <div className="divide-y">
                {rows.map((row) => (
                  <Link key={row.href} href={row.href} className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:text-primary">
                    <row.icon className={`h-4 w-4 ${row.tint}`} />
                    <span className="flex-1 font-medium">{row.label}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/merchant/register">{register.data ? "Manage register" : "Open register"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!data
          ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24" />)
          : data.metrics.map((metric) => <Tile key={metric.id} label={metric.label} value={metric.value} hint={metric.change} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Sales by hour · today</p>
            {report.data ? <HourBars hourly={report.data.hourly} /> : <Skeleton className="h-32 w-full" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">How customers paid · today</p>
            {report.data ? <MixBar rows={report.data.byPayment} currency={currency} /> : <Skeleton className="h-24 w-full" />}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Top products</p>
            {!data ? (
              <Skeleton className="h-24 w-full" />
            ) : data.topProducts.length === 0 ? (
              <Empty>No sales in this period.</Empty>
            ) : (
              data.topProducts.map((product, index) => (
                <div key={`${product.name}-${index}`} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{product.name}</span>
                    <span className="text-xs text-muted-foreground">{product.units} sold</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(6, (product.units / data.topProducts[0].units) * 100)}%` }} />
                  </div>
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
            {!data ? (
              <Skeleton className="h-24 w-full" />
            ) : data.lowStockProducts.length === 0 ? (
              <Empty>Everything is well stocked.</Empty>
            ) : (
              data.lowStockProducts.map((product) => (
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
            {!data ? (
              <Skeleton className="h-24 w-full" />
            ) : data.recentActivity.length === 0 ? (
              <Empty>Nothing yet.</Empty>
            ) : (
              data.recentActivity.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{when(item.date)}</p>
                  </div>
                  <span className={item.type === "expense" ? "text-destructive" : "font-medium"}>
                    {item.type === "expense" ? "-" : ""}{money(item.currency, item.amount)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {data?.insight ? <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{data.insight}</p> : null}
    </div>
  );
}