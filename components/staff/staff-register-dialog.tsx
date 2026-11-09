"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RegisterPanel } from "@/components/register/register-panel";
import type { RegisterClient } from "@/components/register/register-panel";
import { staffApi } from "@/lib/api/staff-client";
import type { RegisterSession } from "@/lib/hooks/use-merchant-ops";

const OPTIONS = { redirectOnExpire: false, timeoutMs: 8000 };
type Reply = { session: RegisterSession | null };

const client: RegisterClient = {
  current: async () => (await staffApi.get<Reply>("/staff-ops/register/current", OPTIONS)).session,
  open: async (openingFloat) => (await staffApi.post<Reply>("/staff-ops/register/open", { openingFloat }, OPTIONS)).session as RegisterSession,
  movement: async (kind, amount, reason) => (await staffApi.post<Reply>("/staff-ops/register/movements", { kind, amount, reason }, OPTIONS)).session as RegisterSession,
  close: async (countedCash, note) => (await staffApi.post<Reply>("/staff-ops/register/close", { countedCash, note }, OPTIONS)).session as RegisterSession,
};

interface StaffRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  enabled: boolean;
}

export function StaffRegisterDialog({ open, onOpenChange, currency, enabled }: StaffRegisterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Cash register</DialogTitle></DialogHeader>
        {!enabled ? (
          <p className="py-10 text-center text-sm text-muted-foreground">The register needs an internet connection.</p>
        ) : open ? (
          <RegisterPanel client={client} currency={currency} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}