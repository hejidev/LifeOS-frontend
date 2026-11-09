"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Banknote, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, money, paymentLabel, when } from "@/components/merchant/ops-ui";
import type { RegisterSession } from "@/lib/hooks/use-merchant-ops";

export interface RegisterClient {
  current: () => Promise<RegisterSession | null>;
  open: (openingFloat: number) => Promise<RegisterSession>;
  movement: (kind: "PAY_IN" | "PAY_OUT", amount: number, reason: string) => Promise<RegisterSession>;
  close: (countedCash: number, note?: string) => Promise<RegisterSession>;
}

type Mode = "idle" | "PAY_IN" | "PAY_OUT" | "close";

const decimal = (value: string) => value.replace(/[^0-9.]/g, "");

function Row({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "danger" ? "text-destructive" : "font-medium"}>{value}</span>
    </div>
  );
}

export function RegisterPanel({ client, currency, onChanged }: { client: RegisterClient; currency: string; onChanged?: () => void }) {
  const [session, setSession] = useState<RegisterSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RegisterSession | null>(null);
  const clientRef = useRef(client);
  clientRef.current = client;
  const m = (value: unknown) => money(currency, value);

  const refresh = useCallback(async () => {
    try {
      setSession(await clientRef.current.current());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the register.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  function reset() {
    setMode("idle");
    setAmount("");
    setReason("");
    setNote("");
  }

  async function run(task: () => Promise<RegisterSession>, after: (next: RegisterSession) => void) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      after(await task());
      reset();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const value = Number(amount);
  const hasAmount = amount !== "" && Number.isFinite(value) && value >= 0;
  const preview = session && mode === "close" && hasAmount ? Math.round((value - session.cash.expected) * 100) / 100 : null;

  if (!loaded) return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;

  if (result) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="flex items-center gap-2 font-semibold"><Banknote className="h-5 w-5 text-primary" /> Register closed</p>
          <Row label="Expected cash" value={m(result.cash.expected)} />
          <Row label="Counted cash" value={m(result.counted)} />
          <div className="rounded-lg bg-muted/50 p-3 text-center text-lg font-bold">
            {result.variance === 0 ? "Balanced" : result.variance! > 0 ? `Over by ${m(result.variance)}` : `Short by ${m(Math.abs(result.variance ?? 0))}`}
          </div>
          <Button className="w-full" onClick={() => setResult(null)}>Done</Button>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2"><Pill>Closed</Pill><p className="text-sm text-muted-foreground">No register is open at this location.</p></div>
          <div className="space-y-1">
            <Label className="text-xs">Opening float ({currency})</Label>
            <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(decimal(event.target.value))} placeholder="0" />
            <p className="text-[11px] text-muted-foreground">The cash already in the drawer before the first sale.</p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={busy || !hasAmount} onClick={() => run(() => clientRef.current.open(Number(amount)), setSession)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Open register
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Pill tone="success">Open</Pill><span className="text-xs text-muted-foreground">since {when(session.openedAt)} by {session.openedByName}</span></div>
            <span className="text-xs text-muted-foreground">{session.salesCount} sale{session.salesCount === 1 ? "" : "s"}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expected cash in the drawer</p>
            <p className="text-4xl font-bold">{m(session.cash.expected)}</p>
          </div>
          <div className="space-y-1.5 border-t pt-3">
            <Row label="Opening float" value={m(session.openingFloat)} />
            <Row label="Cash sales" value={`+${m(session.cash.sales)}`} />
            {session.cash.collections ? <Row label="Credit payments received" value={`+${m(session.cash.collections)}`} /> : null}
            {session.cash.refunds ? <Row label="Cash refunds" value={m(session.cash.refunds)} tone="danger" /> : null}
            {session.cash.payIns ? <Row label="Pay-ins" value={`+${m(session.cash.payIns)}`} /> : null}
            {session.cash.payOuts ? <Row label="Pay-outs" value={`-${m(session.cash.payOuts)}`} tone="danger" /> : null}
          </div>
          {session.other.length > 0 ? (
            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground">Not cash (for reference)</p>
              {session.other.map((row) => <Row key={row.method} label={paymentLabel(row.method)} value={m(row.total)} />)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {mode === "idle" ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => setMode("PAY_IN")}><Plus className="mr-1.5 h-4 w-4" /> Pay in</Button>
          <Button variant="outline" onClick={() => setMode("PAY_OUT")}><Minus className="mr-1.5 h-4 w-4" /> Pay out</Button>
          <Button onClick={() => setMode("close")}>Close register</Button>
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-semibold">{mode === "PAY_IN" ? "Cash in" : mode === "PAY_OUT" ? "Cash out" : "Count the drawer"}</p>
            <div className="space-y-1">
              <Label className="text-xs">{mode === "close" ? `Counted cash (${currency})` : `Amount (${currency})`}</Label>
              <Input inputMode="decimal" autoFocus value={amount} onChange={(event) => setAmount(decimal(event.target.value))} />
            </div>
            {mode === "close" ? (
              <>
                {preview !== null ? (
                  <p className={preview === 0 ? "text-sm font-semibold text-emerald-600" : "text-sm font-semibold text-amber-600"}>
                    {preview === 0 ? "Balanced" : preview > 0 ? `Over by ${m(preview)}` : `Short by ${m(Math.abs(preview))}`}
                  </p>
                ) : null}
                <div className="space-y-1"><Label className="text-xs">Note (optional)</Label><Input value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} /></div>
              </>
            ) : (
              <div className="space-y-1"><Label className="text-xs">Reason</Label><Input value={reason} maxLength={100} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Supplies, delivery, extra change" /></div>
            )}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={busy || !hasAmount || (mode !== "close" && (value <= 0 || reason.trim().length < 2))}
                onClick={() =>
                  mode === "close"
                    ? run(() => clientRef.current.close(value, note.trim() || undefined), (closed) => { setResult(closed); setSession(null); })
                    : run(() => clientRef.current.movement(mode, value, reason.trim()), setSession)
                }
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === "close" ? "Close register" : "Record"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && mode === "idle" ? <p className="text-sm text-destructive">{error}</p> : null}

      {session.movements.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-semibold">Pay-ins and pay-outs</p>
            {session.movements.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between gap-2 text-sm">
                <div><p>{movement.reason}</p><p className="text-[11px] text-muted-foreground">{movement.actorName} · {when(movement.createdAt)}</p></div>
                <span className={movement.kind === "PAY_OUT" ? "text-destructive" : "font-medium"}>{movement.kind === "PAY_OUT" ? "-" : "+"}{m(movement.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}