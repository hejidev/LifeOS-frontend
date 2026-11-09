"use client";

import { useState } from "react";
import { FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, HourBars, MixBar, PageHeader, Tile, money } from "@/components/merchant/ops-ui";
import { dateKey, useDailyReport } from "@/lib/hooks/use-merchant-ops";

export default function DailyReportPage() {
  const [date, setDate] = useState(dateKey(new Date()));
  const { data, isLoading } = useDailyReport(date);
  const currency = data?.currency ?? "NGN";
  const m = (value: unknown) => money(currency, value);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FileText}
        title="Daily report"
        subtitle="Sales, payments, staff and busiest hours"
        actions={
          <>
            <Input type="date" value={date} max={dateKey(new Date())} onChange={(event) => event.target.value && setDate(event.target.value)} className="w-40" />
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" /> Print</Button>
          </>
        }
      />

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Revenue" value={m(data.summary.revenue)} />
            <Tile label="Orders" value={String(data.summary.orders)} hint={`Average ${m(data.summary.avgOrderValue)}`} />
            <Tile label="Expenses" value={m(data.summary.expenses)} hint={`${data.summary.expenseCount} logged`} />
            <Tile label="Net" value={m(data.summary.net)} tone={data.summary.net < 0 ? "danger" : "success"} />
          </div>

          {data.summary.creditCount > 0 || data.summary.refundedCount > 0 || data.summary.discounts > 0 ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Tile label="Discounts given" value={m(data.summary.discounts)} />
              <Tile label={`Refunds (${data.summary.refundedCount})`} value={m(data.summary.refundedTotal)} tone={data.summary.refundedCount > 0 ? "danger" : undefined} />
              <Tile label={`Sold on credit (${data.summary.creditCount})`} value={m(data.summary.creditTotal)} hint="Counts as revenue once paid" />
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Sales by hour</p>
                <HourBars hourly={data.hourly} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">How customers paid</p>
                <MixBar rows={data.byPayment} currency={currency} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">By staff</p>
                {data.byStaff.length === 0 ? <Empty>No sales.</Empty> : data.byStaff.map((row) => (
                  <div key={row.id ?? "none"} className="space-y-1">
                    <div className="flex justify-between text-sm"><span>{row.name}</span><span className="font-medium">{m(row.total)}</span></div>
                    <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(4, (row.total / data.byStaff[0].total) * 100)}%` }} /></div>
                    <p className="text-[11px] text-muted-foreground">{row.count} sale{row.count === 1 ? "" : "s"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold">Top products</p>
                {data.topProducts.length === 0 ? <Empty>No sales.</Empty> : data.topProducts.map((row, index) => (
                  <div key={`${row.name}-${index}`} className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{row.name} <span className="text-xs text-muted-foreground">· {row.units} sold</span></span>
                    <span className="font-medium">{m(row.revenue)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}