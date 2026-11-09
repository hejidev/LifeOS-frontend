"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, PageHeader, Pill, money, when } from "@/components/merchant/ops-ui";
import { RegisterPanel } from "@/components/register/register-panel";
import type { RegisterClient } from "@/components/register/register-panel";
import { api } from "@/lib/api/client";
import { useStoreContext } from "@/lib/context/store-context";
import { useBizProfile } from "@/lib/hooks/use-life-data";
import { useRegisterHistory } from "@/lib/hooks/use-merchant-ops";

export default function RegisterPage() {
  const qc = useQueryClient();
  const { currentStoreId, currentStore } = useStoreContext();
  const { data: profile } = useBizProfile();
  const history = useRegisterHistory();
  const currency: string = profile?.currency ?? "NGN";

  const client = useMemo<RegisterClient>(
    () => ({
      current: () => api.get(`/ops/register/current?storeId=${currentStoreId}`).then((d) => d.session),
      open: (openingFloat) => api.post("/ops/register/open", { openingFloat, storeId: currentStoreId }).then((d) => d.session),
      movement: (kind, amount, reason) => api.post("/ops/register/movements", { kind, amount, reason, storeId: currentStoreId }).then((d) => d.session),
      close: (countedCash, note) => api.post("/ops/register/close", { countedCash, note, storeId: currentStoreId }).then((d) => d.session),
    }),
    [currentStoreId]
  );

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["ops"] });
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={Banknote} title="Cash register" subtitle={currentStore ? `${currentStore.name} · counts the drawer and spots cash that doesn't add up` : undefined} />

      <div className="grid gap-5 lg:grid-cols-2">
        {currentStoreId ? <RegisterPanel key={currentStoreId} client={client} currency={currency} onChanged={refresh} /> : null}

        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="mb-2 text-sm font-semibold">Previous registers</p>
            {!history.data || history.data.length === 0 ? (
              <Empty>No closed registers yet.</Empty>
            ) : (
              history.data.map((row) => (
                <div key={row.id} className="space-y-1 border-b py-3 text-sm last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{row.closedAt ? when(row.closedAt) : ""}</span>
                    {row.variance === 0 ? <Pill tone="success">Balanced</Pill> : row.variance > 0 ? <Pill tone="warning">Over {money(currency, row.variance)}</Pill> : <Pill tone="danger">Short {money(currency, Math.abs(row.variance))}</Pill>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Float {money(currency, row.openingFloat)} · expected {money(currency, row.expectedCash)} · counted {money(currency, row.countedCash)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Opened by {row.openedByName}{row.closedByName ? `, closed by ${row.closedByName}` : ""}{row.note ? ` · ${row.note}` : ""}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}