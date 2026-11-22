"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Section } from "@/components/app/kit";
import { useExchangeRates, useUserProfile } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";

const POPULAR = ["NGN", "USD", "EUR", "GBP", "GHS", "ZAR", "KES", "CAD", "AUD", "AED", "CNY", "INR", "JPY"];

function currencyName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const formatNumber = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: value !== 0 && Math.abs(value) < 1 ? 6 : 2 }).format(value);

export function CurrencyTool() {
  const { data: profile } = useUserProfile();
  const [fromChoice, setFromChoice] = useState<string | null>(null);
  const [toChoice, setToChoice] = useState<string | null>(null);
  const [amount, setAmount] = useState("1000");

  const from = fromChoice ?? profile?.currency ?? "NGN";
  const to = toChoice ?? (from === "USD" ? "NGN" : "USD");
  const { data, isLoading, isError, error, refetch } = useExchangeRates(from);

  const codes = useMemo(() => {
    const list = data?.rates ? Object.keys(data.rates).sort() : POPULAR;
    return [...new Set([from, to, ...list])];
  }, [data, from, to]);

  const parsed = Number(amount.replace(/,/g, ""));
  const valid = amount.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
  const rate: number | undefined = data?.rates?.[to];
  const updated = data?.date && !Number.isNaN(Date.parse(data.date)) ? new Date(data.date).toLocaleDateString(undefined, { dateStyle: "medium" }) : null;
  const select = "flex h-10 w-full rounded-lg border bg-background px-3 text-sm";

  function swap() {
    setFromChoice(to);
    setToChoice(from);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Convert">
        <div className="space-y-1"><Label>Amount</Label><Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-11 text-lg" /></div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div className="space-y-1"><Label>From</Label><select className={select} value={from} onChange={(event) => setFromChoice(event.target.value)}>{codes.map((code) => <option key={code} value={code}>{code} · {currencyName(code)}</option>)}</select></div>
          <Button type="button" size="icon" variant="outline" className="h-10 w-10" aria-label="Swap currencies" onClick={swap}><ArrowLeftRight className="h-4 w-4" /></Button>
          <div className="space-y-1"><Label>To</Label><select className={select} value={to} onChange={(event) => setToChoice(event.target.value)}>{codes.map((code) => <option key={code} value={code}>{code} · {currencyName(code)}</option>)}</select></div>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : isError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{(error as Error).message}</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
          </div>
        ) : (
          <div className="space-y-1 rounded-xl border bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">{valid ? `${formatNumber(parsed)} ${from} =` : "Enter an amount"}</p>
            <p className="text-3xl font-bold tabular-nums">{valid && rate !== undefined ? `${formatNumber(parsed * rate)} ${to}` : "--"}</p>
            {rate !== undefined && <p className="text-xs text-muted-foreground">1 {from} = {formatNumber(rate)} {to}{updated ? ` · updated ${updated}` : ""}</p>}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Daily mid-market rates, not what a bank or street exchange will give you. <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">Rates By Exchange Rate API</a>
        </p>
      </Section>

      <Section title={`1 ${from} in other currencies`}>
        {isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {POPULAR.filter((code) => code !== from && data?.rates?.[code]).map((code) => (
              <button key={code} type="button" onClick={() => setToChoice(code)} className={cn("flex items-center justify-between rounded-lg border p-2.5 text-left text-sm transition-colors hover:border-primary/40", code === to && "border-primary bg-primary/5")}>
                <span className="font-medium">{code}</span>
                <span className="tabular-nums text-muted-foreground">{formatNumber(data.rates[code])}</span>
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}