"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { KeyRound, MailCheck, MoreHorizontal, Search, ShieldOff, Trash2 } from "lucide-react";
import {
  useChangeUserRole,
  useDeletePlatformUser,
  usePlatformUsers,
  useSupportEmailChange,
  useSupportPasswordReset,
  useSupportTwoFactorReset,
  useToggleUserStatus,
} from "@/lib/hooks/use-life-data";

type User = {
  id: string; name: string; email: string; role: "USER" | "ADMIN" | "SUPER_ADMIN";
  plan: string; status: "active" | "suspended"; twoFactorEnabled?: boolean; provider?: string;
};
type Action = "password" | "email" | "twoFactor" | "delete" | null;

const supportCopy = {
  password: { title: "Send password reset", description: "A secure, 15-minute reset link will be sent to the account email. No password is revealed to support." },
  email: { title: "Change account email", description: "Send a verification link to the new address. The account email changes only after the user confirms it." },
  twoFactor: { title: "Reset two-factor authentication", description: "This removes the current authenticator and signs the user out everywhere. They must configure 2FA again after signing in." },
  delete: { title: "Permanently delete user", description: "This deletes the standard user account and its associated data. This cannot be undone." },
} as const;

export function UserSupportConsole({ allowRoleControls = false, allowPermanentDelete = false }: { allowRoleControls?: boolean; allowPermanentDelete?: boolean }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const { data: users = [], isLoading } = usePlatformUsers(search || undefined);
  const toggleStatus = useToggleUserStatus();
  const changeRole = useChangeUserRole();
  const passwordReset = useSupportPasswordReset();
  const emailChange = useSupportEmailChange();
  const twoFactorReset = useSupportTwoFactorReset();
  const deleteUser = useDeletePlatformUser();

  const pending = passwordReset.isPending || emailChange.isPending || twoFactorReset.isPending || deleteUser.isPending;
  const actionInfo = action ? supportCopy[action] : null;
  const errors = [passwordReset.error, emailChange.error, twoFactorReset.error, deleteUser.error].filter(Boolean) as Error[];
  const error = errors.at(-1)?.message;
  const canSubmit = reason.trim().length >= 8 && (action !== "email" || /\S+@\S+\.\S+/.test(newEmail)) && (action !== "delete" || confirmationEmail.trim().toLowerCase() === selected?.email.toLowerCase());

  const openSupport = (user: User, nextAction: Action) => {
    setSelected(user); setAction(nextAction); setReason(""); setNewEmail(""); setConfirmationEmail("");
  };
  const closeSupport = () => { if (!pending) { setSelected(null); setAction(null); } };
  const submit = () => {
    if (!selected || !action || !canSubmit) return;
    const onSuccess = closeSupport;
    if (action === "password") passwordReset.mutate({ id: selected.id, reason }, { onSuccess });
    if (action === "email") emailChange.mutate({ id: selected.id, email: newEmail, reason }, { onSuccess });
    if (action === "twoFactor") twoFactorReset.mutate({ id: selected.id, reason }, { onSuccess });
    if (action === "delete") deleteUser.mutate({ id: selected.id, confirmationEmail, reason }, { onSuccess });
  };

  const userRows = useMemo(() => users as User[], [users]);
  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Account operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">User support console</h1>
          <p className="mt-1 text-muted-foreground">Resolve account access issues without handling passwords or bypassing verification.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 px-3 py-1.5"><ShieldOff className="h-3.5 w-3.5" /> Sensitive actions are audited</Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or email…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead><tr className="border-b bg-muted/40 text-left">
              <th className="p-4 font-medium">Account</th><th className="p-4 font-medium">Access</th><th className="p-4 font-medium">Security</th><th className="p-4 font-medium">Plan</th><th className="p-4 font-medium text-right">Actions</th>
            </tr></thead>
            <tbody>{userRows.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="p-4"><p className="font-medium">{user.name || "Unnamed user"}</p><p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p></td>
                <td className="p-4"><div className="flex items-center gap-2"><Badge variant={user.status === "active" ? "success" : "destructive"}>{user.status}</Badge>{allowRoleControls ? <select className="h-7 rounded-md border bg-background px-1.5 text-xs" value={user.role} onChange={(e) => changeRole.mutate({ id: user.id, role: e.target.value as User["role"] })}><option value="USER">User</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super admin</option></select> : <Badge variant="outline">{user.role.replace("_", " ")}</Badge>}</div></td>
                <td className="p-4"><Badge variant={user.twoFactorEnabled ? "success" : "secondary"}>{user.twoFactorEnabled ? "2FA enabled" : "2FA off"}</Badge><p className="mt-1 text-[11px] text-muted-foreground">{user.provider === "CREDENTIALS" ? "Password account" : "OAuth account"}</p></td>
                <td className="p-4"><Badge variant={user.plan === "free" ? "secondary" : "default"}>{user.plan}</Badge></td>
                <td className="p-4"><div className="flex justify-end gap-1.5"><Button variant="outline" size="sm" onClick={() => toggleStatus.mutate(user.id)} disabled={toggleStatus.isPending}>{user.status === "active" ? "Suspend" : "Activate"}</Button><Button variant="secondary" size="sm" onClick={() => { setSelected(user); setAction(null); }}><MoreHorizontal className="mr-1 h-3.5 w-3.5" /> Support</Button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && closeSupport()}>
        <DialogContent className="max-w-lg">
          {!action ? <>
            <DialogHeader><DialogTitle>Support {selected?.name || "user"}</DialogTitle><DialogDescription>{selected?.email} · choose a verified recovery action.</DialogDescription></DialogHeader>
            <div className="grid gap-2 py-2">
              <Button variant="outline" className="justify-start" onClick={() => setAction("password")}><KeyRound className="mr-2 h-4 w-4" /> Send password reset link</Button>
              <Button variant="outline" className="justify-start" onClick={() => setAction("email")}><MailCheck className="mr-2 h-4 w-4" /> Verify a new email address</Button>
              <Button variant="outline" className="justify-start" disabled={!selected?.twoFactorEnabled} onClick={() => setAction("twoFactor")}><ShieldOff className="mr-2 h-4 w-4" /> Reset two-factor authentication</Button>
              {allowPermanentDelete && selected?.role === "USER" && <Button variant="destructive" className="justify-start" onClick={() => setAction("delete")}><Trash2 className="mr-2 h-4 w-4" /> Permanently delete account</Button>}
            </div>
          </> : <>
            <DialogHeader><DialogTitle>{actionInfo?.title}</DialogTitle><DialogDescription>{actionInfo?.description}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              {action === "email" && <div className="space-y-1.5"><label className="text-sm font-medium">New email address</label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new-address@example.com" /></div>}
              {action === "delete" && <div className="space-y-1.5"><label className="text-sm font-medium">Type {selected?.email} to confirm</label><Input type="email" value={confirmationEmail} onChange={(e) => setConfirmationEmail(e.target.value)} /></div>}
              <div className="space-y-1.5"><label className="text-sm font-medium">Support reason</label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ticket ID and identity-verification details…" /><p className="text-xs text-muted-foreground">This reason is retained in the admin audit trail.</p></div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setAction(null)} disabled={pending}>Back</Button><Button variant={action === "delete" ? "destructive" : "default"} onClick={submit} disabled={!canSubmit || pending}>{pending ? "Processing…" : action === "delete" ? "Delete permanently" : "Confirm action"}</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
