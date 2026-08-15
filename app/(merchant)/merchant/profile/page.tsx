"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  User, Lock, SlidersHorizontal, Camera, Check, Eye, EyeOff, ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useUserProfile, useUpdateUserProfile, useUpdatePreferences,
  useUploadAccountAvatar, useChangeAccountPassword,
} from "@/lib/hooks/use-life-data";
import Image from "next/image";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function getInitials(name?: string, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "U";
}

function getTimezones(): string[] {
  try {
    if (typeof Intl.supportedValuesOf === "function") return Intl.supportedValuesOf("timeZone");
  } catch {}
  return [
    "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "Europe/London", "Europe/Berlin", "Europe/Paris", "Africa/Lagos", "Africa/Nairobi",
    "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney",
  ];
}

function passwordChecks(password: string) {
  return [
    { label: "12+ characters", pass: password.length >= 12 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Lowercase letter", pass: /[a-z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
    { label: "Symbol", pass: /[^A-Za-z0-9]/.test(password) },
  ];
}

export default function MerchantProfilePage() {
  const { data: profile, isLoading } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const updatePreferences = useUpdatePreferences();
  const uploadAvatar = useUploadAccountAvatar();
  const changePassword = useChangeAccountPassword();

  const [tab, setTab] = useState<"personal" | "security" | "preferences">("personal");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [personalForm, setPersonalForm] = useState({ name: "", timezone: "", location: "", currency: "" });
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [prefsForm, setPrefsForm] = useState({ darkMode: false, weekStartsOn: 1 });

  const timezones = useMemo(getTimezones, []);
  const p = profile as any;

  useEffect(() => {
    if (p) {
      setPersonalForm({
        name: p.name ?? "", timezone: p.timezone ?? "UTC",
        location: p.location ?? "", currency: p.currency ?? "USD",
      });
      setPrefsForm({ darkMode: !!p.preferences?.darkMode, weekStartsOn: p.preferences?.weekStartsOn ?? 1 });
    }
  }, [p]);

  function flashSaved(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2000);
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAvatar.mutate(file, { onSuccess: () => flashSaved("Photo updated") });
  }

  function handlePersonalSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateProfile.mutate(personalForm, { onSuccess: () => flashSaved("Profile saved") });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New passwords don't match");
      return;
    }
    changePassword.mutate(
      { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
      {
        onSuccess: () => {
          setPwSuccess(true);
          setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
          setTimeout(() => setPwSuccess(false), 3000);
        },
        onError: (err: any) => setPwError(err.message ?? "Failed to update password"),
      }
    );
  }

  function handlePrefToggle(key: "darkMode", value: boolean) {
    const next = { ...prefsForm, [key]: value };
    setPrefsForm(next);
    updatePreferences.mutate(next);
  }

  function handleWeekStartChange(value: number) {
    const next = { ...prefsForm, weekStartsOn: value };
    setPrefsForm(next);
    updatePreferences.mutate(next);
  }

  if (isLoading || !p) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  const checks = passwordChecks(pwForm.newPassword);
  const allChecksPass = checks.every((c) => c.pass);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-8xl space-y-5 sm:space-y-6 px-1">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> Profile
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Manage your personal account and security.</p>
        </div>
        {savedMsg && <Badge variant="secondary">{savedMsg}</Badge>}
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="pt-5 sm:pt-6 flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border border-border">
                <img src={p.avatarUrl ?? undefined} alt={p.name ?? p.email} />
                <AvatarFallback className="text-lg font-medium">{getInitials(p.name, p.email)}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleAvatarClick}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.email}</p>
              <Badge variant="outline" className="text-[10px] mt-1 capitalize">{(p.role ?? "user").toLowerCase()}</Badge>
              {uploadAvatar.isPending && <p className="text-[11px] text-muted-foreground mt-1">Uploading...</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="personal" className="gap-1.5 text-sm"><User className="h-3.5 w-3.5" /> Personal</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-sm"><Lock className="h-3.5 w-3.5" /> Security</TabsTrigger>
            <TabsTrigger value="preferences" className="gap-1.5 text-sm"><SlidersHorizontal className="h-3.5 w-3.5" /> Preferences</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {tab === "personal" && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="pt-5 sm:pt-6">
              <form onSubmit={handlePersonalSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Full name</Label>
                  <Input value={personalForm.name} onChange={(e) => setPersonalForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={p.email} disabled className="bg-muted/50" />
                  <p className="text-[11px] text-muted-foreground">Email can't be changed here — contact support if you need this updated.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Timezone</Label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      value={personalForm.timezone}
                      onChange={(e) => setPersonalForm((f) => ({ ...f, timezone: e.target.value }))}
                    >
                      {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Currency</Label>
                    <Input
                      value={personalForm.currency}
                      onChange={(e) => setPersonalForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                      maxLength={3}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Input value={personalForm.location} onChange={(e) => setPersonalForm((f) => ({ ...f, location: e.target.value }))} placeholder="City, Country" />
                </div>
                <Button type="submit" size="sm" disabled={updateProfile.isPending} className="w-full sm:w-auto">
                  {updateProfile.isPending ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "security" && (
        <motion.div variants={item} className="space-y-4">
          <Card>
            <CardContent className="pt-5 sm:pt-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <p className="text-sm font-medium flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Change password</p>
                <div className="space-y-1">
                  <Label className="text-xs">Current password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPw ? "text" : "password"}
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                      className="pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowCurrentPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">New password</Label>
                  <div className="relative">
                    <Input
                      type={showNewPw ? "text" : "password"}
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                      className="pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowNewPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pwForm.newPassword.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {checks.map((c) => (
                        <div key={c.label} className={cn("flex items-center gap-1 text-[11px]", c.pass ? "text-emerald-500" : "text-muted-foreground")}>
                          <Check className={cn("h-3 w-3", !c.pass && "opacity-30")} /> {c.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Confirm new password</Label>
                  <Input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" size="sm" disabled={changePassword.isPending || !allChecksPass} className="w-full sm:w-auto">
                  {changePassword.isPending ? "Updating..." : "Update password"}
                </Button>
                {pwError && <p className="text-xs text-destructive">{pwError}</p>}
                {pwSuccess && <p className="text-xs text-emerald-500">Password updated successfully.</p>}
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "preferences" && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="pt-5 sm:pt-6 space-y-5">
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Dark mode</p>
                  <p className="text-xs text-muted-foreground">Use a dark interface theme.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefsForm.darkMode}
                  onChange={(e) => handlePrefToggle("darkMode", e.target.checked)}
                  className="h-5 w-5 rounded accent-primary shrink-0"
                />
              </label>

              <div className="space-y-1.5">
                <Label className="text-xs">Week starts on</Label>
                <select
                  className="flex h-10 w-full sm:w-48 rounded-lg border border-input bg-background px-3 text-sm"
                  value={prefsForm.weekStartsOn}
                  onChange={(e) => handleWeekStartChange(Number(e.target.value))}
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}