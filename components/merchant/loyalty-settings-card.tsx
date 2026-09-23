"use client";

import { useState, useEffect } from "react";
import { Gift, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusinessProfile, useUpdateBusinessProfile } from "@/lib/hooks/use-life-data";

export function LoyaltySettingsCard() {
  const { data: profile } = useBusinessProfile();
  const updateProfile = useUpdateBusinessProfile();

  const [enabled, setEnabled] = useState(true);
  const [earnRate, setEarnRate] = useState("1");
  const [redemptionValue, setRedemptionValue] = useState("1");

  useEffect(() => {
    if (!profile) return;
    setEnabled((profile as any).loyaltyEnabled ?? true);
    setEarnRate(String((profile as any).loyaltyEarnRate ?? 1));
    setRedemptionValue(String((profile as any).loyaltyRedemptionValue ?? 1));
  }, [profile]);

  function handleSave() {
    updateProfile.mutate({
      loyaltyEnabled: enabled,
      loyaltyEarnRate: parseInt(earnRate) || 1,
      loyaltyRedemptionValue: parseInt(redemptionValue) || 1,
    } as any);
  }

  const currency = (profile as any)?.currency ?? "NGN";

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" /> Loyalty Program
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable loyalty points</p>
            <p className="text-xs text-muted-foreground">Customers earn points on every paid sale</p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        {enabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Points per {currency} 100 spent</Label>
                <Input type="number" min={0} value={earnRate} onChange={(e) => setEarnRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{currency} value per point</Label>
                <Input type="number" min={0} value={redemptionValue} onChange={(e) => setRedemptionValue(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Example: a {currency} 2,500 sale earns {Math.floor(2500 / 100) * (parseInt(earnRate) || 0)} points. Redeeming 50 points gives {currency} {50 * (parseInt(redemptionValue) || 0)} off.
            </p>
          </>
        )}

        <Button onClick={handleSave} disabled={updateProfile.isPending} className="w-full">
          <Save className="h-3.5 w-3.5 mr-2" /> {updateProfile.isPending ? "Saving..." : "Save loyalty settings"}
        </Button>
      </CardContent>
    </Card>
  );
}