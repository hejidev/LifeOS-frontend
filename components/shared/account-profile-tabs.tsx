"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Lock, SlidersHorizontal, Camera, Check, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useUserProfile, useUpdateUserProfile, useUpdatePreferences,
  useUploadAccountAvatar, useChangeAccountPassword,
} from "@/lib/hooks/use-life-data";
import { TwoFactorSection } from "./two-factor-section";

function getInitials(name?: string, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "U";
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

export function AccountProfileTabs({ title }: { title: string }) {
  const { data: profile, isLoading } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const updatePreferences = useUpdatePreferences();
  const uploadAvatar = useUploadAccountAvatar();
  const changePassword = useChangeAccountPassword();

  const [tab, setTab] = useState<"personal" | "security" | "preferences">("personal");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [personalForm, setPersonalForm] = useState({ name: "" });
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [prefsForm, setPrefsForm] = useState({ darkMode: false, weekStartsOn: 1 });

  const p = profile as any;

  useEffect(() => {
    if (p) {
      setPersonalForm({ name: p.name ?? "" });
      setPrefsForm({ darkMode: !!p.preferences?.darkMode, weekStartsOn: p.preferences?.weekStartsOn ?? 1 });
    }
  }, [p]);

  function flashSaved(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2000);
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
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError("New passwords don't match"); return; }
    changePassword.mutate(
      { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
      {
        onSuccess: () => { setPwSuccess(true); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setTimeout(() => setPwSuccess(false), 3000); },
        onError: (err: any) => setPwError(err.message ?? "Failed to update password"),
      }
    );
  }

  function handlePrefToggle(value: boolean) {
    const next = { ...prefsForm, darkMode: value };
    setPrefsForm(next);
    updatePreferences.mutate(next);
  }

  if (isLoading || !p) return null;
  const checks = passwordChecks(pwForm.newPassword);
  const allChecksPass = checks.every((c) => c.pass);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-8xl space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base sm:text-2xl font-bold flex items-center gap-2"><User className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> {title}</h1>
          <p className="text-muted-foreground text-[10px] sm:text-sm mt-1">Manage your account and security.</p>
        </div>
        {savedMsg && <Badge variant="secondary" className="text-[10px] sm:text-xs">{savedMsg}</Badge>}
      </div>

      <Card>
        <CardContent className="pt-4 sm:pt-6 flex items-center gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 border border-border">
              <AvatarImage src={p.avatarUrl ?? undefined} alt={p.name ?? p.email} />
              <AvatarFallback className="text-base sm:text-lg font-medium">{getInitials(p.name, p.email)}</AvatarFallback>
            </Avatar>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
              <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium truncate">{p.name}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{p.email}</p>
            <Badge variant="outline" className="text-[9px] sm:text-[10px] mt-1 capitalize">{(p.role ?? "user").toLowerCase().replace("_", " ")}</Badge>
            {uploadAvatar.isPending && <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Uploading...</p>}
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="personal" className="gap-1 sm:gap-1.5 text-xs sm:text-sm"><User className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Personal</TabsTrigger>
          <TabsTrigger value="security" className="gap-1 sm:gap-1.5 text-xs sm:text-sm"><Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Security</TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1 sm:gap-1.5 text-xs sm:text-sm"><SlidersHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Preferences</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "personal" && (
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <form onSubmit={handlePersonalSubmit} className="space-y-4">
              <div className="space-y-1"><Label className="text-[10px] sm:text-xs">Full name</Label><Input value={personalForm.name} onChange={(e) => setPersonalForm({ name: e.target.value })} className="text-xs sm:text-sm" /></div>
              <div className="space-y-1"><Label className="text-[10px] sm:text-xs">Email</Label><Input value={p.email} disabled className="bg-muted/50 text-xs sm:text-sm" /></div>
              <Button type="submit" size="sm" disabled={updateProfile.isPending} className="w-full sm:w-auto text-xs sm:text-sm">{updateProfile.isPending ? "Saving..." : "Save changes"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <p className="text-xs sm:text-sm font-medium">Change password</p>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">Current password</Label>
                  <Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} required className="text-xs sm:text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">New password</Label>
                  <div className="relative">
                    <Input type={showPw ? "text" : "password"} value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} className="pr-10 text-xs sm:text-sm" required />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                      {showPw ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                    </button>
                  </div>
                  {pwForm.newPassword.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {checks.map((c) => (
                        <div key={c.label} className={cn("flex items-center gap-1 text-[10px] sm:text-[11px]", c.pass ? "text-emerald-500" : "text-muted-foreground")}>
                          <Check className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3", !c.pass && "opacity-30")} /> {c.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1"><Label className="text-[10px] sm:text-xs">Confirm new password</Label><Input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} required className="text-xs sm:text-sm" /></div>
                <Button type="submit" size="sm" disabled={changePassword.isPending || !allChecksPass} className="w-full sm:w-auto text-xs sm:text-sm">{changePassword.isPending ? "Updating..." : "Update password"}</Button>
                {pwError && <p className="text-[10px] sm:text-xs text-destructive">{pwError}</p>}
                {pwSuccess && <p className="text-[10px] sm:text-xs text-emerald-500">Password updated.</p>}
              </form>
            </CardContent>
          </Card>
          <TwoFactorSection />
        </div>
      )}

      {tab === "preferences" && (
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div><p className="text-xs sm:text-sm font-medium">Dark mode</p><p className="text-[10px] sm:text-xs text-muted-foreground">Use a dark interface theme.</p></div>
              <input type="checkbox" checked={prefsForm.darkMode} onChange={(e) => handlePrefToggle(e.target.checked)} className="h-4 w-4 sm:h-5 sm:w-5 rounded accent-primary shrink-0" />
            </label>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}