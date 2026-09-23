"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Package, Users, AlertTriangle, DollarSign, Receipt, Repeat, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBusinessAnalytics, useBusinessProfile, type AnalyticsRangeValue } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const PRESETS: { value: "week" | "month" | "quarter" | "year"; label: string }[] = [
    { value: "week", label: "This week" },
    { value: "month", label: "This month" },
    { value: "quarter", label: "Last 3 months" },
    { value: "year", label: "This year" },
];

export default function AnalyticsPage() {
    const [rangeValue, setRangeValue] = useState<AnalyticsRangeValue>({ mode: "preset", range: "month" });
    const [customOpen, setCustomOpen] = useState(false);
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");

    const { data, isLoading } = useBusinessAnalytics(rangeValue);
    const { data: profile } = useBusinessProfile();
    const currency = (profile as any)?.currency ?? "NGN";

    const d = data as any;
    const maxDaily = d?.dailyTrend?.length ? Math.max(...d.dailyTrend.map((p: any) => p.revenue), 1) : 1;
    const maxProductRevenue = d?.topProducts?.length ? Math.max(...d.topProducts.map((p: any) => p.revenue), 1) : 1;

    function applyCustomRange() {
        if (!customFrom || !customTo) return;
        setRangeValue({ mode: "custom", from: customFrom, to: customTo });
        setCustomOpen(false);
    }

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 min-w-0 max-w-7xl">
            <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-linear-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
                        <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Analytics</h1>
                        <p className="text-muted-foreground text-xs sm:text-sm">Trends, product performance, and customer behavior</p>
                    </div>
                </div>
            </motion.div>

            <motion.div variants={item} className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/50 p-1 w-fit">
                    {PRESETS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => { setRangeValue({ mode: "preset", range: p.value }); setCustomOpen(false); }}
                            className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${rangeValue.mode === "preset" && rangeValue.range === p.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setCustomOpen((v) => !v)}
                        className={`h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${rangeValue.mode === "custom" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Calendar className="h-3 w-3" /> Custom
                    </button>
                </div>

                {customOpen && (
                    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
                        <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">From</label>
                            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">To</label>
                            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <Button size="sm" className="h-8 text-xs" onClick={applyCustomRange} disabled={!customFrom || !customTo}>
                            Apply
                        </Button>
                    </div>
                )}

                {rangeValue.mode === "custom" && (
                    <p className="text-xs text-muted-foreground">
                        Showing {new Date(rangeValue.from).toLocaleDateString()} – {new Date(rangeValue.to).toLocaleDateString()}
                    </p>
                )}
            </motion.div>

            {isLoading || !d ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
                <>
                    <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card className="bg-linear-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                            <CardContent className="pt-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-emerald-700">Revenue</p>
                                    <p className="text-xl font-bold text-emerald-900 mt-0.5">{currency} {d.summary.totalRevenue.toLocaleString()}</p>
                                </div>
                                <div className="p-2.5 bg-emerald-500/20 rounded-full"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
                            </CardContent>
                        </Card>
                        <Card className="bg-linear-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                            <CardContent className="pt-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-blue-700">Orders</p>
                                    <p className="text-xl font-bold text-blue-900 mt-0.5">{d.summary.orderCount}</p>
                                </div>
                                <div className="p-2.5 bg-blue-500/20 rounded-full"><Receipt className="h-4 w-4 text-blue-600" /></div>
                            </CardContent>
                        </Card>
                        <Card className="bg-linear-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                            <CardContent className="pt-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-purple-700">Avg order value</p>
                                    <p className="text-xl font-bold text-purple-900 mt-0.5">{currency} {d.summary.avgOrderValue.toLocaleString()}</p>
                                </div>
                                <div className="p-2.5 bg-purple-500/20 rounded-full"><TrendingUp className="h-4 w-4 text-purple-600" /></div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={item}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Revenue trend</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                {d.dailyTrend.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No sales in this period yet.</p>
                ) : (
                  <div className="w-full min-w-0 max-w-full overflow-x-auto pb-1">
                    <div className="flex items-end gap-1 h-32" style={{ width: "max-content" }}>
                      {d.dailyTrend.map((p: any) => (
                        <div key={p.date} className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: d.dailyTrend.length > 60 ? "4px" : d.dailyTrend.length > 31 ? "8px" : "20px" }}>
                          <div
                            className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors"
                            style={{ height: `${Math.max(2, (p.revenue / maxDaily) * 100)}px` }}
                            title={`${new Date(p.date).toLocaleDateString()}: ${currency} ${p.revenue.toLocaleString()}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <motion.div variants={item}>
                            <Card className="h-full">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Top products</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2.5">
                                    {d.topProducts.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-6">No sales yet.</p>
                                    ) : (
                                        d.topProducts.map((p: any, idx: number) => (
                                            <div key={p.id ?? `${p.name}-${idx}`} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-medium truncate">{p.name}</span>
                                                    <span className="text-muted-foreground shrink-0">{currency} {p.revenue.toLocaleString()} · {p.unitsSold} sold</span>
                                                </div>
                                                <div className="w-full h-1.5 rounded-full bg-muted">
                                                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(3, (p.revenue / maxProductRevenue) * 100)}%` }} />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={item}>
                            <Card className="h-full">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Customer retention</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                                            <p className="text-xs text-muted-foreground">New customers</p>
                                            <p className="text-xl font-bold mt-0.5">{d.customerRetention.newCustomers}</p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                                            <p className="text-xs text-muted-foreground">Returning</p>
                                            <p className="text-xl font-bold mt-0.5">{d.customerRetention.returningCustomers}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
                                        <Repeat className="h-4 w-4 text-primary shrink-0" />
                                        <p className="text-xs">
                                            <span className="font-semibold">{d.customerRetention.repeatBuyers}</span> customer{d.customerRetention.repeatBuyers !== 1 ? "s" : ""} placed 2+ orders this period
                                            {d.customerRetention.totalCustomersInPeriod > 0 && (
                                                <span className="text-muted-foreground"> ({Math.round((d.customerRetention.repeatBuyers / d.customerRetention.totalCustomersInPeriod) * 100)}% of active customers)</span>
                                            )}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {d.deadStock.length > 0 && (
                        <motion.div variants={item}>
                            <Card className="border-amber-500/30 bg-linear-to-r from-amber-500/10 to-orange-500/5">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2 text-amber-900"><AlertTriangle className="h-4 w-4" /> Not selling this period</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-amber-700 mb-3">These products have stock on hand but zero sales in the selected period — worth a closer look.</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {d.deadStock.map((p: any) => (
                                            <div key={p.name} className="rounded-lg bg-background/60 border border-amber-500/20 px-3 py-2">
                                                <p className="text-xs font-medium truncate">{p.name}</p>
                                                <p className="text-[11px] text-muted-foreground">{p.stock} in stock</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </>
            )}
        </motion.div>
    );
}