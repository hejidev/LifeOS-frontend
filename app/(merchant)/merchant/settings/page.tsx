"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Settings, Copy, CreditCard, ShieldAlert, Bell, Store, UserCog,
  RefreshCw, LogOut, PauseCircle, PlayCircle, ExternalLink, AlertTriangle,
  Gift, TrendingUp, MapPin, Activity, Image as ImageIcon, CheckCircle2, Users,
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
import { LoyaltySettingsCard } from "@/components/merchant/loyalty-settings-card";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const TABS = [
  { key: "profile", label: "Business Profile", icon: Store },
  { key: "security", label: "Security", icon: ShieldAlert },
  { key: "staff", label: "Staff & Access", icon: UserCog },
  { key: "loyalty", label: "Loyalty", icon: Gift },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "danger", label: "Danger Zone", icon: AlertTriangle },
] as const;

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function MerchantSettingsPage() {
  const [tab, setTab] = useState<"profile" | "security" | "staff" | "loyalty" | "notifications" | "billing" | "danger">("profile");

  const { data: profile } = useBusinessProfile();
  const updateProfile = useUpdateBusinessProfile();
  const { data: storeCode } = useMerchantStaffLoginCode();
  const regenerateCode = useRegenerateStoreCode();
  const forceLogout = useForceStaffLogout();
  const updateNotifications = useUpdateNotificationSettings();
  const setPaused = useSetStorePaused();
  const { data: staff = [] } = useMerchantStaff();
  const { data: status } = useMerchantStatus();

  const [profileForm, setProfileForm] = useState({ businessName: "", currency: "", description: "", logoUrl: "" });
  const [notifForm, setNotifForm] = useState({ notifyLowStock: true, notifyNewSale: false, notifyDailySummary: false });
  const [copied, setCopied] = useState(false);
  const [forceLogoutConfirm, setForceLogoutConfirm] = useState(false);
  const [pauseConfirm, setPauseConfirm] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setProfileForm({ businessName: p.businessName ?? "", currency: p.currency ?? "", description: p.description ?? "", logoUrl: p.logoUrl ?? "" });
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-8xl space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-linear-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Merchant Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage your business profile, security, staff, and billing.</p>
          </div>
        </div>
        {savedMsg && (
          <Badge variant="secondary" className="gap-1.5 animate-in fade-in">
            <CheckCircle2 className="h-3 w-3" /> {savedMsg}
          </Badge>
        )}
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex-wrap h-auto bg-muted/50 p-1.5 rounded-xl shadow-sm gap-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200"
              >
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {tab === "profile" && (
        <motion.div variants={item} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-linear-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-700">Status</p>
                  <p className="text-lg font-bold text-blue-900 mt-0.5 capitalize">{(p?.status ?? s?.status ?? "—").toLowerCase()}</p>
                </div>
                <div className="p-2.5 bg-blue-500/20 rounded-full"><Store className="h-4 w-4 text-blue-600" /></div>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-700">Plan</p>
                  <p className="text-lg font-bold text-purple-900 mt-0.5 capitalize">{(s?.planTier ?? "none").toLowerCase()}</p>
                </div>
                <div className="p-2.5 bg-purple-500/20 rounded-full"><CreditCard className="h-4 w-4 text-purple-600" /></div>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
              <CardContent className="pt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-700">Active staff</p>
                  <p className="text-lg font-bold text-emerald-900 mt-0.5">{activeStaffCount}</p>
                </div>
                <div className="p-2.5 bg-emerald-500/20 rounded-full"><Users className="h-4 w-4 text-emerald-600" /></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Business profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                  {profileForm.logoUrl ? (
                    <img src={profileForm.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Logo URL (optional)</Label>
                  <Input value={profileForm.logoUrl} onChange={(e) => setProfileForm((f) => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Business name</Label><Input value={profileForm.businessName} onChange={(e) => setProfileForm((f) => ({ ...f, businessName: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Currency</Label><Input value={profileForm.currency} onChange={(e) => setProfileForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={3} /></div>
              </div>
              <div className="space-y-1"><Label>Description</Label><Textarea rows={3} value={profileForm.description} onChange={(e) => setProfileForm((f) => ({ ...f, description: e.target.value }))} /></div>
              {p && (
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-3 border-t border-border">
                  <p>Category: <span className="text-foreground">{p.category ?? "—"}</span></p>
                  <span>Application status: <Badge variant="secondary" className="text-[10px] ml-1">{p.status ?? s?.status}</Badge></span>
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
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-linear-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-blue-700">Total staff</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{staff.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-emerald-700">Active</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{activeStaffCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: "/merchant/staff", label: "Manage Staff", desc: "Add, edit, suspend, or remove team members", icon: UserCog, color: "text-blue-600 bg-blue-500/10" },
              { href: "/merchant/staff/activity", label: "Activity Log", desc: "See every clock-in, sale, and note across your team", icon: Activity, color: "text-purple-600 bg-purple-500/10" },
              { href: "/merchant/staff/performance", label: "Performance", desc: "Revenue and sales rung up per staff member", icon: TrendingUp, color: "text-emerald-600 bg-emerald-500/10" },
              { href: "/merchant/locations", label: "Locations", desc: "Manage branches and assign staff to a store", icon: MapPin, color: "text-amber-600 bg-amber-500/10" },
            ].map((linkItem) => (
              <Link key={linkItem.href} href={linkItem.href}>
                <Card className="h-full hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer">
                  <CardContent className="pt-5 flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg shrink-0 ${linkItem.color}`}>
                      <linkItem.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold">{linkItem.label}</p>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{linkItem.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {tab === "loyalty" && (
        <motion.div variants={item}>
          <LoyaltySettingsCard />
        </motion.div>
      )}

      {tab === "notifications" && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notification preferences</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {[
                { key: "notifyLowStock" as const, label: "Low stock alerts", desc: "Get notified when a product hits its reorder threshold." },
                { key: "notifyNewSale" as const, label: "New sale alerts", desc: "Get notified whenever a sale is completed." },
                { key: "notifyDailySummary" as const, label: "Daily summary", desc: "A daily digest of revenue, sales, and low stock." },
              ].map((n, i) => (
                <div key={n.key} className={`flex items-center justify-between gap-4 py-3.5 ${i > 0 ? "border-t border-border/50" : ""}`}>
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                  </div>
                  <ToggleSwitch checked={notifForm[n.key]} onChange={(v) => setNotifForm((f) => ({ ...f, [n.key]: v }))} />
                </div>
              ))}
              <Button size="sm" className="mt-3" onClick={() => updateNotifications.mutate(notifForm, { onSuccess: () => flashSaved("Preferences saved") })} disabled={updateNotifications.isPending}>
                {updateNotifications.isPending ? "Saving..." : "Save preferences"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === "billing" && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10"><CreditCard className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-sm font-semibold capitalize">{s?.planTier ? `${s.planTier.toLowerCase()} plan` : "No active plan"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s?.planStatus === "ACTIVE" ? `Renews ${new Date(s.currentPeriodEnd).toLocaleDateString()}` : "Choose a plan to activate"}</p>
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