"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { METHODS, money, paymentLabel } from "@/components/merchant/ops-ui";
import { useCollectPayment } from "@/lib/hooks/use-merchant-ops";
import { cn } from "@/lib/utils";

interface CollectFormProps {
  saleId: string;
  balance: number;
  currency: string;
  onDone?: () => void;
}

export function CollectForm({ saleId, balance, currency, onDone }: CollectFormProps) {
  const collect = useCollectPayment();
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState<string>("CASH");
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount);
  const valid = amount !== "" && Number.isFinite(value) && value > 0 && value <= balance;
  const partial = valid && value < balance;

  async function submit() {
    if (!valid) return setError(`Enter an amount up to ${money(currency, balance)}.`);
    setError(null);
    try {
      await collect.mutateAsync({ saleId, paymentMethod: method, amount: value });
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record the payment.");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Amount ({currency})</Label>
          <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setAmount(String(balance))}>
          Full {money(currency, balance)}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {METHODS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMethod(item)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", method === item ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
          >
            {paymentLabel(item)}
          </button>
        ))}
      </div>
      {partial ? <p className="text-xs text-muted-foreground">{money(currency, balance - value)} will still be owed after this.</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="button" className="w-full" disabled={collect.isPending || !valid} onClick={submit}>
        {collect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Record payment
      </Button>
    </div>
  );
}