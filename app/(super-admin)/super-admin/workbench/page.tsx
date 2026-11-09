"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LifeBuoy, Loader2, Search, StickyNote, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Empty, PageHeader, Pill, Tile, daysAgo, money, when } from "@/components/merchant/ops-ui";
import {
  useAddSupportNote,
  useDeleteSupportNote,
  useMerchantAction,
  useSupportAccount,
  useSupportQueues,
  useSupportSearch,
} from "@/lib/hooks/use-platform-tools";
import { useForceLogoutUser, useSupportPasswordReset, useSupportTwoFactorReset, useToggleUserStatus } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";

interface PendingAction {
  key: string;
  title: string;
  description: string;
  destructive?: boolean;
  run: (reason: string) => Promise<unknown>;
}

const ROLE_TONES: Record<string, "primary" | "warning" | "neutral"> = { SUPER_ADMIN: "warning", ADMIN: "warning", USER: "neutral" };

function ActionDialog({ pending, onClose }: { pending: PendingAction | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason("");
    setError(null);
    setBusy(false);
  }, [pending?.key]);

  async function confirm() {
    if (!pending || reason.trim().length < 5) return setError("Give a reason of at least 5 characters. It goes in the audit log.");
    setBusy(true);
    setError(null);
    try {
      await pending.run(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{pending?.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{pending?.description}</p>
          <Textarea rows={3} autoFocus placeholder="Reason (recorded in the audit log)" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" variant={pending?.destructive ? "destructive" : "default"} onClick={confirm} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccountPanel({ id }: { id: string }) {
  const { data, isLoading, error } = useSupportAccount(id);
  const addNote = useAddSupportNote();
  const removeNote = useDeleteSupportNote(id);
  const toggleStatus = useToggleUserStatus();
  const forceLogout = useForceLogoutUser();
  const passwordReset = useSupportPasswordReset();
  const twoFactorReset = useSupportTwoFactorReset();
  const merchantAction = useMerchantAction();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <Empty>We couldn't load this account.</Empty>;

  const { identity, merchant } = data;
  const log = (text: string, reason: string) => addNote.mutateAsync({ id, body: `${text}. Reason: ${reason}` });

  const accountActions: PendingAction[] = [
    {
      key: "toggle",
      title: identity.isActive ? "Suspend this account" : "Reactivate this account",
      description: identity.isActive ? "They can't sign in until you reactivate them." : "They'll be able to sign in again.",
      destructive: identity.isActive,
      run: async (reason) => {
        await toggleStatus.mutateAsync(id);
        await log(identity.isActive ? "Suspended the account" : "Reactivated the account", reason);
      },
    },
    {
      key: "logout",
      title: "Sign out everywhere",
      description: "Ends all of their sessions. They'll need to sign in again.",
      run: async (reason) => {
        await forceLogout.mutateAsync(id);
        await log("Signed the user out everywhere", reason);
      },
    },
    {
      key: "password",
      title: "Send a password reset",
      description: `Sends a reset link to ${identity.email}.`,
      run: (reason) => passwordReset.mutateAsync({ id, reason }),
    },
    {
      key: "2fa",
      title: "Reset two-factor authentication",
      description: "Removes their authenticator so they can set it up again.",
      destructive: true,
      run: (reason) => twoFactorReset.mutateAsync({ id, reason }),
    },
  ];

  const storeActions: PendingAction[] = merchant
    ? [
        {
          key: "staff-logout",
          title: "Sign out all staff",
          description: "Every staff terminal and phone for this business must sign in again.",
          run: (reason) => merchantAction.mutateAsync({ id, action: "FORCE_STAFF_LOGOUT", reason }),
        },
        {
          key: "store-code",
          title: "Regenerate the staff sign-in code",
          description: "The old code stops working immediately. Staff will need the new one.",
          destructive: true,
          run: async (reason) => {
            const result = await merchantAction.mutateAsync({ id, action: "REGENERATE_STORE_CODE", reason });
            setNotice(`New staff sign-in code: ${result.storeCode}`);
          },
        },
        {
          key: "pause",
          title: merchant.paused ? "Resume the store" : "Pause the store",
          description: merchant.paused ? "The dashboard and staff access switch back on." : "Switches off the dashboard and all staff access. Billing continues.",
          destructive: !merchant.paused,
          run: (reason) => merchantAction.mutateAsync({ id, action: merchant.paused ? "RESUME_STORE" : "PAUSE_STORE", reason }),
        },
      ]
    : [];

  async function submitNote() {
    const body = note.trim();
    if (body.length < 2) return;
    await addNote.mutateAsync({ id, body });
    setNote("");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{identity.name}</h2>
            <Pill tone={ROLE_TONES[identity.role] ?? "neutral"}>{identity.role.replace("_", " ").toLowerCase()}</Pill>
            <Pill tone={identity.isActive ? "success" : "danger"}>{identity.isActive ? "Active" : "Suspended"}</Pill>
            {identity.twoFactor ? <Pill tone="primary">2FA on</Pill> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {identity.email} · joined {new Date(identity.createdAt).toLocaleDateString()}{identity.provider ? ` · ${identity.provider}` : ""}
          </p>
          <p className="break-all font-mono text-[11px] text-muted-foreground">{identity.id}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Where they land when they sign in</p>
            <Pill tone="primary">{data.landing.label}</Pill>
          </div>
          <div className="space-y-2">
            {data.checks.map((check) => (
              <div key={check.label} className="flex items-start gap-2.5 text-sm">
                {check.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                <div>
                  <p className="font-medium">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {merchant ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{merchant.businessName}</p>
              <Pill>{merchant.status.toLowerCase()}</Pill>
              {merchant.planTier ? <Pill tone={merchant.planStatus === "ACTIVE" ? "success" : "warning"}>{merchant.planTier.toLowerCase()} · {(merchant.planStatus ?? "none").toLowerCase()}</Pill> : null}
              {merchant.paused ? <Pill tone="warning">Paused</Pill> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile label="Sales, 30 days" value={String(merchant.stats.sales30d)} hint={money(merchant.currency, merchant.stats.revenue30d)} />
              <Tile label="Last sale" value={merchant.stats.lastSaleAt ? daysAgo(merchant.stats.lastSaleAt) : "None"} />
              <Tile label="Owed to them" value={money(merchant.currency, merchant.stats.owedTotal)} hint={`${merchant.stats.owedCount} unpaid sales`} />
              <Tile label="Need review" value={String(merchant.stats.needsReview)} tone={merchant.stats.needsReview > 0 ? "danger" : undefined} />
              <Tile label="Products" value={String(merchant.stats.products)} />
              <Tile label="Customers" value={String(merchant.stats.customers)} />
              <Tile label="Staff" value={String(merchant.stats.staffActive)} hint={merchant.stats.staffSuspended ? `${merchant.stats.staffSuspended} suspended` : undefined} />
              <Tile label="Locations" value={String(merchant.stats.stores)} hint={merchant.stats.openRegisters ? `${merchant.stats.openRegisters} register open` : undefined} />
            </div>
            <p className="text-xs text-muted-foreground">
              Staff sign-in code: <span className="font-mono font-semibold text-foreground">{merchant.storeCode ?? "none"}</span>
              {merchant.currentPeriodEnd ? ` · plan period ends ${new Date(merchant.currentPeriodEnd).toLocaleDateString()}` : ""}
            </p>
            {notice ? <p className="rounded-lg bg-emerald-500/10 p-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">{notice}</p> : null}
            <div className="flex flex-wrap gap-2">
              {storeActions.map((action) => (
                <Button key={action.key} variant="outline" size="sm" onClick={() => { setNotice(null); setPending(action); }}>{action.title}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold">Account actions</p>
          <div className="flex flex-wrap gap-2">
            {accountActions.map((action) => (
              <Button key={action.key} variant="outline" size="sm" className={cn(action.destructive && "text-destructive")} onClick={() => setPending(action)}>{action.title}</Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold"><StickyNote className="h-4 w-4 text-primary" /> Support notes</p>
          <div className="space-y-2">
            <Textarea rows={2} placeholder="Add a note for the support team" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} />
            <Button size="sm" onClick={submitNote} disabled={note.trim().length < 2 || addNote.isPending}>Add note</Button>
          </div>
          {data.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {data.notes.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="whitespace-pre-wrap break-words text-sm">{item.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.authorName} · {when(item.createdAt)}</p>
                  </div>
                  <button className="text-muted-foreground hover:text-destructive" aria-label="Delete note" onClick={() => removeNote.mutate(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ActionDialog pending={pending} onClose={() => setPending(null)} />
    </div>
  );
}

export default function WorkbenchPage() {
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const search = useSupportSearch(term);
  const queues = useSupportQueues();

  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("id");
    if (requested) setSelected(requested);
  }, []);

  const sections = queues.data
    ? [
        { title: "Applications waiting", rows: queues.data.pending },
        { title: "Payment failed", rows: queues.data.pastDue },
        { title: "Suspended merchants", rows: queues.data.suspended },
        { title: "Paused stores", rows: queues.data.paused },
      ]
    : [];

  return (
    <div className="space-y-5">
      <PageHeader icon={LifeBuoy} title="Support workbench" subtitle="Find any account, see exactly what they see, and fix it with an audit trail" />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Name, email, business or ID" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>

          {term.length >= 2 ? (
            <Card>
              <CardContent className="p-0">
                {search.isLoading ? (
                  <div className="space-y-2 p-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
                ) : !search.data || search.data.length === 0 ? (
                  <Empty>No account matches.</Empty>
                ) : (
                  <div className="divide-y">
                    {search.data.map((account) => (
                      <button key={account.id} onClick={() => setSelected(account.id)} className={cn("w-full px-3 py-2.5 text-left hover:bg-muted/40", account.id === selected && "bg-muted/60")}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{account.name}</span>
                          <Pill tone={account.isActive ? "neutral" : "danger"}>{account.isActive ? account.role.replace("_", " ").toLowerCase() : "suspended"}</Pill>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                        {account.merchant ? <p className="truncate text-[11px] text-muted-foreground">{account.merchant.businessName} · {account.merchant.status.toLowerCase()}</p> : null}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            sections.map((section) => (
              <Card key={section.title}>
                <CardContent className="p-0">
                  <p className="flex items-center justify-between px-3 pt-3 text-xs font-semibold text-muted-foreground">
                    {section.title} <span>{section.rows.length}</span>
                  </p>
                  {section.rows.length === 0 ? (
                    <p className="px-3 pb-3 pt-1 text-xs text-muted-foreground">Nothing here.</p>
                  ) : (
                    <div className="divide-y">
                      {section.rows.map((row) => (
                        <button key={row.userId} onClick={() => setSelected(row.userId)} className={cn("w-full px-3 py-2 text-left hover:bg-muted/40", row.userId === selected && "bg-muted/60")}>
                          <p className="truncate text-sm font-medium">{row.businessName}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{row.detail}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div>{selected ? <AccountPanel key={selected} id={selected} /> : <Empty>Search for an account, or pick one from a queue.</Empty>}</div>
      </div>
    </div>
  );
}