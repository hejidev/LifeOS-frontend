"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Settings, Copy, CreditCard, ShieldAlert, Bell, Store, UserCog,
  RefreshCw, LogOut, PauseCircle, PlayCircle, ExternalLink, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useBusinessProfile, useUpdateBusinessProfile, useMerchantStaffLoginCode,
  useRegenerateStoreCode, useForceStaffLogout, useUpdateNotificationSettings, useSetStorePaused,
  useMerchantStaff, useMerchantStatus,
} from "@/lib/hooks/use-life-data";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function MerchantSettingsPage() {
  const [tab, setTab] = useState<"profile" | "security" | "staff" | "notifications" | "billing" | "danger">("profile");

  const { data: profile } = useBusinessProfile();
  const updateProfile = useUpdateBusinessProfile();
  const { data: storeCode } = useMerchantStaffLoginCode();
  const regenerateCode = useRegenerateStoreCode();
  const forceLogout = useForceStaffLogout();
  const updateNotifications = useUpdateNotificationSettings();
  const setPaused = useSetStorePaused();
  const { data: staff = [] } = useMerchantStaff();
  const { data: status } = useMerchantStatus();

  const [profileForm, setProfileForm] = useState({ businessName: "", currency: "", description: "" });
  const [notifForm, setNotifForm] = useState({ notifyLowStock: true, notifyNewSale: false, notifyDailySummary: false });
  const [copied, setCopied] = useState(false);
  const [forceLogoutConfirm, setForceLogoutConfirm] = useState(false);
  const [pauseConfirm, setPauseConfirm] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setProfileForm({ businessName: p.businessName ?? "", currency: p.currency ?? "", description: p.description ?? "" });
      setNotifForm({ notifyLowStock: p.notifyLowStock ?? true, notifyNewSale: p.notifyNewSale ?? false, notifyDailySummary: p.notifyDailySummary ?? false });
    }
  }, [profile]);

  const p = profile as any;
  const s = status as any;
  const activeStaffCount = (staff as any[]).filter((st) => st.status === "ACTIVE").length;

  function flashSaved(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2000);
  }

  function handleCopyCode() {
    if (!storeCode) return;
    navigator.clipboard.writeText(storeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const TABS = [
    { key: "profile", label: "Business Profile", icon: Store },
    { key: "security", label: "Security", icon: ShieldAlert },
    { key: "staff", label: "Staff & Access", icon: UserCog },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "billing", label: "Billing", icon: CreditCard },
    { key: "danger", label: "Danger Zone", icon: AlertTriangle },
  ] as const;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-8xl space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Merchant Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your business profile, security, staff, and billing.</p>
        </div>
        {savedMsg && <Badge variant="secondary" className="animate-in fade-in">{savedMsg}</Badge>}
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex-wrap h-auto">
            {TABS.map((t) => <TabsTrigger key={t.key} value={t.key} className="gap-1.5"><t.icon className="h-3.5 w-3.5" />{t.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </motion.div>

      {tab === "profile" && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Business profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Business name</Label><Input value={profileForm.businessName} onChange={(e) => setProfileForm((f) => ({ ...f, businessName: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Currency</Label><Input value={profileForm.currency} onChange={(e) => setProfileForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={3} /></div>
              </div>
              <div className="space-y-1"><Label>Description</Label><Textarea rows={3} value={profileForm.description} onChange={(e) => setProfileForm((f) => ({ ...f, description: e.target.value }))} /></div>
              {p && (
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
                  <p>Category: <span className="text-foreground">{p.category ?? "—"}</span></p>
                  <span>Status: <Badge variant="secondary" className="text-[10px] ml-1">{p.status ?? s?.status}</Badge></span>
                  <p>Contact: <span className="text-foreground">{p.contactEmail}</span></p>
                  <p>Phone: <span className="text-foreground">{p.contactPhone}</span></p>
                </div>
              )}
              <Button size="sm" onClick={() => updateProfile.mutate(profileForm, { onSuccess: () => flashSaved("Profile saved") })} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save changes"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "security" && (
        <motion.div variants={item} className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Staff store code</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Staff use this code with their name and PIN to sign in at <span className="font-mono">/staff/login</span>. Anyone with this code can attempt a login — treat it like a shared door key.</p>
              {storeCode && (
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted/50 rounded px-3 py-2 font-mono tracking-widest">{storeCode}</code>
                  <Button size="sm" variant="outline" onClick={handleCopyCode}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              )}
              {copied && <p className="text-xs text-emerald-500">Copied to clipboard</p>}
              <Button size="sm" variant="outline" onClick={() => regenerateCode.mutate(undefined, { onSuccess: () => flashSaved("New code generated") })} disabled={regenerateCode.isPending}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> {regenerateCode.isPending ? "Generating..." : "Regenerate code"}
              </Button>
              <p className="text-[11px] text-muted-foreground">Regenerating invalidates the old code immediately — staff will need the new one for their next login.</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><LogOut className="h-4 w-4 text-amber-500" /> Force sign out all staff</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Instantly ends every active staff session on every device — {activeStaffCount} staff member{activeStaffCount === 1 ? "" : "s"} currently active. Use this if a device is lost or someone leaves the team.</p>
              <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10" onClick={() => setForceLogoutConfirm(true)}>
                Force sign out all staff
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Account security</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Your login password, email, and account-level security live under your personal LifeOS settings.</p>
              <Button size="sm" variant="outline" asChild><Link href="/app/settings">Manage account security <ExternalLink className="ml-1 h-3 w-3" /></Link></Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "staff" && (
        <motion.div variants={item} className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base">Staff overview</CardTitle>
              <Button size="sm" variant="outline" asChild><Link href="/merchant/staff">Manage staff <ExternalLink className="ml-1 h-3 w-3" /></Link></Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/60 bg-card/60 p-3"><p className="text-xs text-muted-foreground">Total staff</p><p className="text-xl font-semibold">{staff.length}</p></div>
                <div className="rounded-lg border border-border/60 bg-card/60 p-3"><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-semibold">{activeStaffCount}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Staff activity log</CardTitle></CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" asChild><Link href="/merchant/staff/activity">View full activity log <ExternalLink className="ml-1 h-3 w-3" /></Link></Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "notifications" && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Notification preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "notifyLowStock" as const, label: "Low stock alerts", desc: "Get notified when a product hits its reorder threshold." },
                { key: "notifyNewSale" as const, label: "New sale alerts", desc: "Get notified whenever a sale is completed." },
                { key: "notifyDailySummary" as const, label: "Daily summary", desc: "A daily digest of revenue, sales, and low stock." },
              ].map((n) => (
                <label key={n.key} className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifForm[n.key]}
                    onChange={(e) => setNotifForm((f) => ({ ...f, [n.key]: e.target.checked }))}
                    className="h-5 w-5 rounded accent-primary shrink-0"
                  />
                </label>
              ))}
              <Button size="sm" onClick={() => updateNotifications.mutate(notifForm, { onSuccess: () => flashSaved("Preferences saved") })} disabled={updateNotifications.isPending}>
                {updateNotifications.isPending ? "Saving..." : "Save preferences"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "billing" && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><CreditCard className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-sm font-medium">{s?.planTier ? `${s.planTier} plan` : "No active plan"}</p>
                  <p className="text-xs text-muted-foreground">{s?.planStatus === "ACTIVE" ? `Renews ${new Date(s.currentPeriodEnd).toLocaleDateString()}` : "Choose a plan to activate"}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" asChild><Link href="/merchant/billing">Manage billing</Link></Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "danger" && (
        <motion.div variants={item}>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Danger zone</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{p?.paused ? "Store is paused" : "Pause your store"}</p>
                  <p className="text-xs text-muted-foreground">{p?.paused ? "Your merchant dashboard is inaccessible until you reactivate." : "Temporarily block access to your merchant dashboard without canceling billing."}</p>
                </div>
                <Button size="sm" variant={p?.paused ? "default" : "outline"} onClick={() => setPauseConfirm(true)}>
                  {p?.paused ? <><PlayCircle className="mr-1 h-3.5 w-3.5" /> Reactivate</> : <><PauseCircle className="mr-1 h-3.5 w-3.5" /> Pause store</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Dialog open={forceLogoutConfirm} onOpenChange={setForceLogoutConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Force sign out all staff?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground pt-2">Every staff member will be logged out immediately and need to sign in again with the store code.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setForceLogoutConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => forceLogout.mutate(undefined, { onSuccess: () => { setForceLogoutConfirm(false); flashSaved("All staff signed out"); } })} disabled={forceLogout.isPending}>
              {forceLogout.isPending ? "Signing out..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pauseConfirm} onOpenChange={setPauseConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{p?.paused ? "Reactivate your store?" : "Pause your store?"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground pt-2">
            {p?.paused ? "Your merchant dashboard will become accessible again immediately." : "Your merchant dashboard will be inaccessible to you and your staff until you reactivate."}
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPauseConfirm(false)}>Cancel</Button>
            <Button variant={p?.paused ? "default" : "destructive"} onClick={() => setPaused.mutate(!p?.paused, { onSuccess: () => { setPauseConfirm(false); flashSaved(p?.paused ? "Store reactivated" : "Store paused"); } })} disabled={setPaused.isPending}>
              {setPaused.isPending ? "Working..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}