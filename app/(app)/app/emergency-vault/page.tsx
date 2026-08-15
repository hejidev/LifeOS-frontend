"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import {
  HeartPulse, Plus, Trash2, Share2, Copy, ShieldOff, Lock, Printer,
  ArrowUp, ArrowDown, Stethoscope, ShieldCheck, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useEmergencyProfile, useUpdateEmergencyProfile, useAddEmergencyContact, useDeleteEmergencyContact,
  useEnableEmergencyShare, useDisableEmergencyShare, useSetEmergencyPin, useReorderEmergencyContacts, useEmergencyAccessLog,
} from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function calcAge(dob?: string) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default function EmergencyVaultPage() {
  const { data: profile, isLoading } = useEmergencyProfile();
  const updateProfile = useUpdateEmergencyProfile();
  const addContact = useAddEmergencyContact();
  const deleteContact = useDeleteEmergencyContact();
  const reorderContacts = useReorderEmergencyContacts();
  const enableShare = useEnableEmergencyShare();
  const disableShare = useDisableEmergencyShare();
  const setPin = useSetEmergencyPin();
  const { data: accessLog = [] } = useEmergencyAccessLog();

  const [tab, setTab] = useState<"medical" | "contacts" | "sharing" | "activity">("medical");
  const [form, setForm] = useState({
    dateOfBirth: "", bloodType: "", organDonor: false, pregnancyStatus: false, dnrStatus: false,
    height: "", weight: "", preferredHospital: "", physicianName: "", physicianPhone: "",
    insuranceProvider: "", insurancePhone: "", insurancePolicy: "",
    allergies: "", conditions: "", medications: "", notes: "",
  });
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", relationship: "", phone: "", email: "", canMakeMedicalDecisions: false });
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setForm({
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
        bloodType: p.bloodType ?? "", organDonor: !!p.organDonor, pregnancyStatus: !!p.pregnancyStatus, dnrStatus: !!p.dnrStatus,
        height: p.height ?? "", weight: p.weight ?? "", preferredHospital: p.preferredHospital ?? "",
        physicianName: p.physicianName ?? "", physicianPhone: p.physicianPhone ?? "",
        insuranceProvider: p.insuranceProvider ?? "", insurancePhone: p.insurancePhone ?? "", insurancePolicy: p.insurancePolicy ?? "",
        allergies: p.allergies ?? "", conditions: p.conditions ?? "", medications: p.medications ?? "", notes: p.notes ?? "",
      });
    }
  }, [profile]);

  useEffect(() => {
    const p = profile as any;
    if (p?.shareEnabled && p?.shareToken) {
      const url = `${window.location.origin}/emergency/${p.shareToken}`;
      QRCode.toDataURL(url, { width: 220, margin: 1 }).then(setQrImage);
    } else {
      setQrImage(null);
    }
  }, [profile]);

  if (isLoading || !profile) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  const p = profile as any;
  const shareUrl = p.shareToken ? `${window.location.origin}/emergency/${p.shareToken}` : null;
  const age = calcAge(p.dateOfBirth);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateProfile.mutate(form, { onSuccess: () => { setSavedJustNow(true); setTimeout(() => setSavedJustNow(false), 2500); } });
  }

  function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    addContact.mutate(contactForm, { onSuccess: () => { setContactOpen(false); setContactForm({ name: "", relationship: "", phone: "", email: "", canMakeMedicalDecisions: false }); } });
  }

  function moveContact(index: number, direction: -1 | 1) {
    const contacts = [...p.contacts];
    const target = index + direction;
    if (target < 0 || target >= contacts.length) return;
    [contacts[index], contacts[target]] = [contacts[target], contacts[index]];
    reorderContacts.mutate(contacts.map((c: any) => c.id));
  }

  function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    setPin.mutate(pinInput || null, { onSuccess: () => { setPinDialogOpen(false); setPinInput(""); } });
  }

  return (
    <div className="print:hidden">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><HeartPulse className="h-6 w-6 text-primary" /> Emergency Vault</h1>
            <p className="text-muted-foreground mt-1">Critical medical info, encrypted at rest, accessible via a secure PIN-protected link.</p>
          </div>
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print wallet card</Button>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-colors">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">Profile completeness</p>
                  <span className="text-xs text-muted-foreground">{p.completeness}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${p.completeness >= 80 ? "bg-emerald-500" : p.completeness >= 40 ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${p.completeness}%` }} />
                </div>
              </div>
              {p.shareEnabled && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Views</p>
                  <p className="text-lg font-semibold">{p.viewCount}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="sharing">Sharing</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {tab === "medical" && (
          <motion.div variants={item}>
            <Card className="hover:border-primary/20 transition-colors">
              <CardContent className="pt-6">
                <form onSubmit={handleSave} className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" /> Personal & vitals</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Date of birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} /></div>
                      <div className="space-y-1">
                        <Label className="text-xs">Blood type</Label>
                        <select className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.bloodType} onChange={(e) => setForm((f) => ({ ...f, bloodType: e.target.value }))}>
                          <option value="">Unknown</option>
                          {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Height</Label><Input value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} placeholder="175cm" /></div>
                      <div className="space-y-1"><Label className="text-xs">Weight</Label><Input value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} placeholder="70kg" /></div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.organDonor} onChange={(e) => setForm((f) => ({ ...f, organDonor: e.target.checked }))} className="rounded" /><span className="text-sm">Organ donor</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.pregnancyStatus} onChange={(e) => setForm((f) => ({ ...f, pregnancyStatus: e.target.checked }))} className="rounded" /><span className="text-sm">Pregnant</span></label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.dnrStatus} onChange={(e) => setForm((f) => ({ ...f, dnrStatus: e.target.checked }))} className="rounded" /><span className="text-sm">DNR order</span></label>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Care team</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Preferred hospital</Label><Input value={form.preferredHospital} onChange={(e) => setForm((f) => ({ ...f, preferredHospital: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Primary physician</Label><Input value={form.physicianName} onChange={(e) => setForm((f) => ({ ...f, physicianName: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Physician phone</Label><Input value={form.physicianPhone} onChange={(e) => setForm((f) => ({ ...f, physicianPhone: e.target.value }))} /></div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Insurance</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Provider</Label><Input value={form.insuranceProvider} onChange={(e) => setForm((f) => ({ ...f, insuranceProvider: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Policy number</Label><Input value={form.insurancePolicy} onChange={(e) => setForm((f) => ({ ...f, insurancePolicy: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Insurance phone</Label><Input value={form.insurancePhone} onChange={(e) => setForm((f) => ({ ...f, insurancePhone: e.target.value }))} /></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1"><Label className="text-xs">Allergies</Label><Textarea rows={2} value={form.allergies} onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))} placeholder="e.g. Penicillin, peanuts" /></div>
                    <div className="space-y-1"><Label className="text-xs">Medical conditions</Label><Textarea rows={2} value={form.conditions} onChange={(e) => setForm((f) => ({ ...f, conditions: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Current medications</Label><Textarea rows={2} value={form.medications} onChange={(e) => setForm((f) => ({ ...f, medications: e.target.value }))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Additional notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? "Saving..." : "Save profile"}</Button>
                    {savedJustNow && <span className="text-xs text-emerald-500">Saved</span>}
                    {updateProfile.isError && <span className="text-xs text-destructive">{(updateProfile.error as Error).message}</span>}
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {tab === "contacts" && (
          <motion.div variants={item}>
            <Card className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3 flex items-center justify-between">
                <CardTitle className="text-base">Emergency contacts</CardTitle>
                <Button size="sm" onClick={() => setContactOpen(true)}><Plus className="mr-1 h-3 w-3" /> Add</Button>
              </CardHeader>
              <CardContent>
                {p.contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No emergency contacts yet.</p>
                ) : (
                  <div className="space-y-2">
                    {p.contacts.map((c: any, i: number) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex flex-col shrink-0">
                            <button type="button" disabled={i === 0} onClick={() => moveContact(i, -1)} className="disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                            <button type="button" disabled={i === p.contacts.length - 1} onClick={() => moveContact(i, 1)} className="disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-medium truncate">{c.name}</p>
                              {i === 0 && <Badge variant="secondary" className="text-[9px]">Primary</Badge>}
                              {c.canMakeMedicalDecisions && <Badge variant="outline" className="text-[9px]">Medical decisions</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{c.relationship ? `${c.relationship} · ` : ""}{c.phone}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => deleteContact.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {tab === "sharing" && (
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" /> Emergency share link</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Anyone with this link (and PIN, if set) sees your emergency info — no login required.</p>
                {p.shareEnabled ? (
                  <>
                    {qrImage && <img src={qrImage} alt="Emergency QR code" className="rounded-lg border border-border/60 mx-auto" />}
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[11px] bg-muted/50 rounded px-2 py-1.5 truncate">{shareUrl}</code>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => shareUrl && navigator.clipboard.writeText(shareUrl)}><Copy className="h-3.5 w-3.5" /></Button>
                    </div>
                    <Button size="sm" variant="destructive" className="w-full" onClick={() => disableShare.mutate()}><ShieldOff className="mr-1 h-3 w-3" /> Disable sharing</Button>
                  </>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => enableShare.mutate(undefined)} disabled={enableShare.isPending}>
                    {enableShare.isPending ? "Enabling..." : "Enable emergency share"}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> PIN protection</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Require a 4–8 digit PIN before your info shows, even with the link.</p>
                <p className="text-sm font-medium">{p.sharePinSet ? "PIN is set" : "No PIN set"}</p>
                <Button size="sm" variant="outline" onClick={() => setPinDialogOpen(true)}>{p.sharePinSet ? "Change or remove PIN" : "Set a PIN"}</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {tab === "activity" && (
          <motion.div variants={item}>
            <Card className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Recent access</CardTitle></CardHeader>
              <CardContent>
                {accessLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No one has viewed your emergency link yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(accessLog as any[]).map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-2 text-xs">
                        <span>{new Date(l.accessedAt).toLocaleString()}</span>
                        <span className="text-muted-foreground truncate max-w-[200px]">{l.ipAddress ?? "Unknown"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Dialog open={contactOpen} onOpenChange={setContactOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add emergency contact</DialogTitle></DialogHeader>
            <form onSubmit={handleAddContact} className="space-y-4 pt-2">
              <div className="space-y-1"><Label>Name</Label><Input value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Relationship</Label><Input value={contactForm.relationship} onChange={(e) => setContactForm((f) => ({ ...f, relationship: e.target.value }))} placeholder="e.g. Spouse" /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} required /></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={contactForm.canMakeMedicalDecisions} onChange={(e) => setContactForm((f) => ({ ...f, canMakeMedicalDecisions: e.target.checked }))} className="rounded" /><span className="text-sm">Can make medical decisions for me</span></label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setContactOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addContact.isPending}>{addContact.isPending ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Set share PIN</DialogTitle></DialogHeader>
            <form onSubmit={handleSetPin} className="space-y-4 pt-2">
              <div className="space-y-1"><Label>4–8 digit PIN (leave blank to remove)</Label><Input value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))} maxLength={8} placeholder="e.g. 4821" /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPinDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={setPin.isPending}>{setPin.isPending ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="hidden print:block">
        <div className="border-4 border-red-600 rounded-xl p-6 max-w-sm mx-auto">
          <h2 className="text-lg font-bold text-red-600 mb-2">EMERGENCY MEDICAL CARD</h2>
          <p className="font-semibold">{p.dateOfBirth ? `Age ${age}` : ""}</p>
          <p>Blood type: {p.bloodType || "Unknown"}</p>
          {p.allergies && <p>Allergies: {p.allergies}</p>}
          {p.conditions && <p>Conditions: {p.conditions}</p>}
          {p.medications && <p>Medications: {p.medications}</p>}
          {p.contacts[0] && <p>Emergency contact: {p.contacts[0].name} — {p.contacts[0].phone}</p>}
          {shareUrl && <p className="mt-2 text-[10px] break-all">Full info: {shareUrl}</p>}
        </div>
      </div>
    </div>
  );
}