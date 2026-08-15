"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { ShieldCheck, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useTwoFactorStatus, useSetupTwoFactor, useEnableTwoFactor, useDisableTwoFactor } from "@/lib/hooks/use-life-data";

export function TwoFactorSection() {
  const qc = useQueryClient();
  const { data: status } = useTwoFactorStatus();
  const setup = useSetupTwoFactor();
  const enable = useEnableTwoFactor();
  const disable = useDisableTwoFactor();

  const [qrImage, setQrImage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [disableForm, setDisableForm] = useState({ password: "", code: "" });
  const [showDisableForm, setShowDisableForm] = useState(false);

  async function handleSetup() {
    const otpauth = await setup.mutateAsync();
    const dataUrl = await QRCode.toDataURL(otpauth, { width: 200, margin: 1 });
    setQrImage(dataUrl);
  }

  function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    enable.mutate(code, {
      onSuccess: () => { setQrImage(null); setCode(""); qc.invalidateQueries({ queryKey: ["twoFactorStatus"] }); },
    });
  }

  function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    disable.mutate(disableForm, {
      onSuccess: () => {
        setDisableForm({ password: "", code: "" });
        setShowDisableForm(false);
        qc.invalidateQueries({ queryKey: ["twoFactorStatus"] });
      },
    });
  }

  const enabled = (status as any)?.enabled;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <p className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Two-factor authentication</p>
        {enabled ? (
          <>
            <p className="text-sm text-emerald-500 flex items-center gap-1"><Check className="h-4 w-4" /> Enabled</p>
            {showDisableForm ? (
              <form onSubmit={handleDisable} className="space-y-3 rounded-lg border border-destructive/30 p-3">
                <p className="text-xs text-muted-foreground">Confirm your password and current authenticator code to disable 2FA.</p>
                <Input type="password" autoComplete="current-password" placeholder="Current password" value={disableForm.password} onChange={(e) => setDisableForm((form) => ({ ...form, password: e.target.value }))} required />
                <Input inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit authenticator code" value={disableForm.code} onChange={(e) => setDisableForm((form) => ({ ...form, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))} required />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" type="submit" disabled={disable.isPending || disableForm.code.length !== 6}>{disable.isPending ? "Disabling..." : "Confirm disable"}</Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => setShowDisableForm(false)}>Cancel</Button>
                </div>
                {disable.isError && <p className="text-xs text-destructive">{(disable.error as Error).message}</p>}
              </form>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowDisableForm(true)}>Disable 2FA</Button>
            )}
          </>
        ) : qrImage ? (
          <form onSubmit={handleEnable} className="space-y-3">
            <img src={qrImage} alt="2FA QR code" className="mx-auto rounded-lg border border-border" />
            <p className="text-xs text-muted-foreground text-center">Scan with Google Authenticator or Authy, then enter the 6-digit code.</p>
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} className="text-center tracking-widest" placeholder="000000" />
            <Button type="submit" className="w-full" disabled={enable.isPending}>{enable.isPending ? "Verifying..." : "Enable 2FA"}</Button>
            {enable.isError && <p className="text-xs text-destructive text-center">{(enable.error as Error).message}</p>}
          </form>
        ) : (
          <Button size="sm" onClick={handleSetup} disabled={setup.isPending}>{setup.isPending ? "Setting up..." : "Set up 2FA"}</Button>
        )}
      </CardContent>
    </Card>
  );
}
