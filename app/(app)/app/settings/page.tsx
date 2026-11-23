"use client";

import { useMemo, useRef, useState } from "react";
import { Bell, Camera, Check, Globe, KeyRound, LayoutGrid, LogOut, Moon, Settings as SettingsIcon, ShieldAlert, SunMedium, User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Section } from "@/components/app/kit";
import { useLogout } from "@/lib/hooks/use-auth";
import {
  useAccountOverview, useChangePassword, useDeactivateAccount, useUpdateNotifications, useUpdatePreferences,
  useUpdateUserProfile, useUploadAccountAvatar, useUserProfile,
} from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/life";
import { ExportData } from "@/components/settings/export-data";

const CURRENCIES = [
  "NGN", "USD", "EUR", "GBP", "GHS", "ZAR", "KES", "CAD", "AUD", "AED", "CNY", "INR", "JPY",
  "XOF", "XAF", "EGP", "TZS", "UGX", "RWF", "BRL", "MXN", "SGD", "CHF", "SAR",
];

const FALLBACK_ZONES = [
  "Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Johannesburg", "Africa/Cairo", "Europe/London", "Europe/Paris",
  "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney", "UTC",
];

const PASSWORD_RULES = [
  { label: "At least 12 characters", test: (value: string) => value.length >= 12 },
  { label: "An uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "A lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "A number", test: (value: string) => /\d/.test(value) },
  { label: "A symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function currencyName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function zoneList(current: string) {
  const reader = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  const list = reader.supportedValuesOf?.("timeZone") ?? FALLBACK_ZONES;
  return list.includes(current) ? list : [current, ...list];
}

function SwitchRow({ title, hint, checked, onChange }: { title: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SettingsForm({ user }: { user: UserProfile }) {
  const { data: overview } = useAccountOverview();
  const updateProfile = useUpdateUserProfile();
  const updatePreferences = useUpdatePreferences();
  const updateNotifications = useUpdateNotifications();
  const changePassword = useChangePassword();
  const deactivate = useDeactivateAccount();
  const uploadAvatar = useUploadAccountAvatar();
  const logout = useLogout();

  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [location, setLocation] = useState(user.location ?? "");
  const [timezone, setTimezone] = useState(user.timezone);
  const [currency, setCurrency] = useState(user.currency);
  const [saved, setSaved] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordDone, setPasswordDone] = useState(false);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateInput, setDeactivateInput] = useState("");
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const zones = useMemo(() => zoneList(user.timezone), [user.timezone]);
  const initials = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";
  const profileDirty = name.trim() !== user.name || location.trim() !== (user.location ?? "");
  const regionDirty = timezone !== user.timezone || currency !== user.currency;

  function flash(key: string) {
    setSaved(key);
    setTimeout(() => setSaved(null), 2500);
  }

  function pickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError(null);
    if (!file.type.startsWith("image/")) return setAvatarError("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setAvatarError("The image is larger than 5 MB.");
    uploadAvatar.mutate(file, { onError: (err: Error) => setAvatarError(err.message) });
  }

  function signOut(destination: string) {
    logout.mutate(undefined, { onSettled: () => { window.location.href = destination; } });
  }

  function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    if (passwords.next !== passwords.confirm) return setPasswordError("The new passwords don't match.");
    if (!PASSWORD_RULES.every((rule) => rule.test(passwords.next))) return setPasswordError("Your new password doesn't meet all the requirements.");

    changePassword.mutate(
      { currentPassword: passwords.current, newPassword: passwords.next },
      {
        onSuccess: () => {
          setPasswordDone(true);
          setTimeout(() => signOut("/login"), 1800);
        },
        onError: (err: Error) => setPasswordError(err.message),
      }
    );
  }

  function submitDeactivate(event: React.FormEvent) {
    event.preventDefault();
    setDeactivateError(null);
    deactivate.mutate(user.hasPassword ? { password: deactivateInput } : { confirmEmail: deactivateInput.trim().toLowerCase() }, {
      onSuccess: () => signOut("/"),
      onError: (err: Error) => setDeactivateError(err.message),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Your profile, region, security and preferences." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Profile" icon={User} action={<Badge variant="secondary" className="capitalize">{user.role.replace("_", " ")}</Badge>}>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileInput.current?.click()} disabled={uploadAvatar.isPending} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full border bg-primary/10" aria-label="Change photo">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-primary">{initials}</span>}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"><Camera className="h-4 w-4 text-white" /></span>
            </button>
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                {user.emailVerified ? "Email verified" : "Email not verified"}
                {user.createdAt ? ` · member since ${new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : ""}
              </p>
              {uploadAvatar.isPending && <p className="text-xs text-muted-foreground">Uploading...</p>}
              {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
            </div>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
          </div>
          <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /></div>
          <div className="space-y-1.5"><Label>Location</Label><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, Country" maxLength={100} /></div>
          <div className="flex items-center gap-3">
            <Button disabled={!profileDirty || !name.trim() || updateProfile.isPending} onClick={() => updateProfile.mutate({ name: name.trim(), location: location.trim() }, { onSuccess: () => flash("profile") })}>
              {updateProfile.isPending ? "Saving..." : "Save profile"}
            </Button>
            {saved === "profile" && <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> Saved</span>}
          </div>
          {updateProfile.isError && <p className="text-xs text-destructive">{(updateProfile.error as Error).message}</p>}
        </Section>

        <Section title="Region" icon={Globe}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Timezone</Label>
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)}>Use this device's timezone</button>
            </div>
            <select className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {zones.map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">Decides when your day starts for tasks, habits, health logs, bedtime and the assistant.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <select className="flex h-10 w-full rounded-lg border bg-background px-3 text-sm" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {CURRENCIES.map((code) => <option key={code} value={code}>{code} · {currencyName(code)}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">Used to show amounts in Finance, the dashboard and the assistant. Existing amounts aren't converted.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button disabled={!regionDirty || updateProfile.isPending} onClick={() => updateProfile.mutate({ timezone, currency }, { onSuccess: () => flash("region") })}>
              {updateProfile.isPending ? "Saving..." : "Save region"}
            </Button>
            {saved === "region" && <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> Saved</span>}
          </div>
        </Section>

        <Section title="Preferences" icon={user.preferences.darkMode ? Moon : SunMedium}>
          <SwitchRow title="Dark mode" hint="Switch the app between light and dark." checked={user.preferences.darkMode} onChange={(value) => updatePreferences.mutate({ darkMode: value })} />
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Week starts on</p>
              <p className="text-xs text-muted-foreground">Used by the calendar, habits and weekly stats.</p>
            </div>
            <Select value={user.preferences.weekStartsOn === 0 ? "sunday" : "monday"} onValueChange={(value) => updatePreferences.mutate({ weekStartsOn: value === "sunday" ? 0 : 1 })}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title="Notifications" icon={Bell}>
          <SwitchRow title="Task reminders" hint="A morning summary of tasks due today and overdue." checked={user.notifications.notifyTasks} onChange={(value) => updateNotifications.mutate({ notifyTasks: value })} />
          <SwitchRow title="Calendar alerts" hint="The events you have today, in your morning summary." checked={user.notifications.notifyCalendar} onChange={(value) => updateNotifications.mutate({ notifyCalendar: value })} />
          <SwitchRow title="Finance nudges" hint="A heads-up when you go over a budget category." checked={user.notifications.notifyFinance} onChange={(value) => updateNotifications.mutate({ notifyFinance: value })} />
          <SwitchRow title="Document expiry" hint="Reminders 30 days, 7 days and 1 day before, and on expiry." checked={user.notifications.notifyDocuments ?? true} onChange={(value) => updateNotifications.mutate({ notifyDocuments: value })} />
          <SwitchRow title="Weekly review email" hint="A short summary every Sunday evening." checked={user.notifications.notifyWeekly ?? true} onChange={(value) => updateNotifications.mutate({ notifyWeekly: value })} />
        </Section>  

        <Section title="Security" icon={KeyRound} className="lg:col-span-2">
          {user.hasPassword === false ? (
            <p className="text-sm text-muted-foreground">You sign in with {user.provider ? user.provider.toLowerCase() : "a connected account"}, so there's no LifeOS password to change.</p>
          ) : passwordDone ? (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">Password updated. You're being signed out on all devices so you can sign in again.</p>
          ) : (
            <form onSubmit={submitPassword} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Current password</Label><Input type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords((p) => ({ ...p, current: event.target.value }))} required /></div>
                <div className="space-y-1.5"><Label>New password</Label><Input type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords((p) => ({ ...p, next: event.target.value }))} required /></div>
                <div className="space-y-1.5"><Label>Confirm new password</Label><Input type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords((p) => ({ ...p, confirm: event.target.value }))} required /></div>
              </div>
              <div className="space-y-3">
                <ul className="space-y-1.5 text-sm">
                  {PASSWORD_RULES.map((rule) => {
                    const met = rule.test(passwords.next);
                    return (
                      <li key={rule.label} className={cn("flex items-center gap-2", met ? "text-emerald-600" : "text-muted-foreground")}>
                        {met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {rule.label}
                      </li>
                    );
                  })}
                </ul>
                {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                <Button type="submit" disabled={changePassword.isPending}>{changePassword.isPending ? "Updating..." : "Update password"}</Button>
                <p className="text-xs text-muted-foreground">Changing your password signs you out of every device.</p>
              </div>
            </form>
          )}
          <div className="border-t pt-4">
            <Button variant="outline" disabled={logout.isPending} onClick={() => signOut("/login")}><LogOut className="mr-1.5 h-4 w-4" /> Sign out</Button>
          </div>
        </Section>

        <Section title="Your data" icon={LayoutGrid} className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {(overview?.modules ?? []).map((module) => (
              <div key={module.id} className="rounded-lg border p-3 text-center">
                <p className="text-xl font-bold tabular-nums">{module.count}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{module.label}</p>
                {module.detail && <p className="text-[10px] text-muted-foreground/70">{module.detail}</p>}
              </div>
            ))}
          </div>
          <ExportData />
        </Section>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold">Deactivate account</p>
              <p className="text-xs text-muted-foreground">Signs you out everywhere and disables your account. Cancel any subscription first. Contact support to restore it.</p>
            </div>
          </div>
          <Button variant="destructive" onClick={() => { setDeactivateInput(""); setDeactivateError(null); setDeactivateOpen(true); }}>Deactivate</Button>
        </div>
      </div>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Deactivate your account?</DialogTitle></DialogHeader>
          <form onSubmit={submitDeactivate} className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">{user.hasPassword ? "Enter your password to confirm." : `Type your email (${user.email}) to confirm.`}</p>
            <Input type={user.hasPassword ? "password" : "email"} value={deactivateInput} onChange={(event) => setDeactivateInput(event.target.value)} autoFocus required />
            {deactivateError && <p className="text-xs text-destructive">{deactivateError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeactivateOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={deactivate.isPending || !deactivateInput.trim()}>{deactivate.isPending ? "Deactivating..." : "Deactivate"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettingsPage() {
  const { data: user, isLoading } = useUserProfile();
  if (isLoading || !user) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;
  return <SettingsForm key={user.id} user={user} />;
}