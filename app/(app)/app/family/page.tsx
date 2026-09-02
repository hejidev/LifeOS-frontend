"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, ShieldCheck, MapPin, Smartphone, Sparkles, Plus, Pencil, Trash2, Mail, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import {
  useFamilyDashboard, useCreateFamilyMember, useUpdateFamilyMember, useDeleteFamilyMember,
  useCreateFamilyControl, useUpdateFamilyControl, useDeleteFamilyControl, useRevokeFamilyInvite,
} from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const ROLE_LABELS: Record<string, string> = { PARENT: "Parent", GUARDIAN: "Guardian", CHILD: "Child" };
const STATUS_LABELS: Record<string, string> = { ONLINE: "Online", OFFLINE: "Offline", AWAY: "Away" };

function formatMinutes(mins: number) {
  if (!mins) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const emptyMemberForm = { name: "", role: "CHILD", device: "", locationSharing: false, status: "OFFLINE", screenTimeMinutesToday: 0 };
const emptyControlForm = { memberId: "", title: "", description: "", value: "", enabled: true };

export default function FamilySpacePage() {
  const { data, isLoading } = useFamilyDashboard();
  const createMember = useCreateFamilyMember();
  const updateMember = useUpdateFamilyMember();
  const deleteMember = useDeleteFamilyMember();
  const createControl = useCreateFamilyControl();
  const updateControl = useUpdateFamilyControl();
  const deleteControl = useDeleteFamilyControl();
  const revokeInvite = useRevokeFamilyInvite();

  const [memberOpen, setMemberOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);

  const [controlOpen, setControlOpen] = useState(false);
  const [controlForm, setControlForm] = useState(emptyControlForm);

  if (isLoading || !data) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  const { members, controls, pendingInvites, stats, insight } = data as any;

  function openCreateMember() {
    setEditingMemberId(null);
    setMemberForm(emptyMemberForm);
    setMemberOpen(true);
  }
  function openEditMember(m: any) {
    setEditingMemberId(m.id);
    setMemberForm({ name: m.name, role: m.role, device: m.device ?? "", locationSharing: m.locationSharing, status: m.status, screenTimeMinutesToday: m.screenTimeMinutesToday ?? 0 });
    setMemberOpen(true);
  }
  function handleMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: memberForm.name, role: memberForm.role, device: memberForm.device || undefined,
      locationSharing: memberForm.locationSharing, status: memberForm.status,
      screenTimeMinutesToday: Number(memberForm.screenTimeMinutesToday) || 0,
    };
    if (editingMemberId) {
      updateMember.mutate({ id: editingMemberId, data: payload }, { onSuccess: () => setMemberOpen(false) });
    } else {
      createMember.mutate(payload as any, { onSuccess: () => setMemberOpen(false) });
    }
  }

  function handleControlSubmit(e: React.FormEvent) {
    e.preventDefault();
    createControl.mutate(
      { memberId: controlForm.memberId || undefined, title: controlForm.title, description: controlForm.description || undefined, value: controlForm.value || undefined, enabled: controlForm.enabled },
      { onSuccess: () => { setControlOpen(false); setControlForm(emptyControlForm); } }
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2"><Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Family Space</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Manage your family members, safety controls, and insights.</p>
        </div>
        <Button onClick={() => setMemberOpen(true)} className="text-xs sm:text-sm"><Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Add member</Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Family members", value: stats.totalMembers, icon: Users },
          { label: "Child profiles", value: stats.childCount, icon: Smartphone },
          { label: "Sharing location", value: stats.locationSharingCount, icon: MapPin },
          { label: "Active controls", value: stats.enabledControls, icon: ShieldCheck },
        ].map((s) => (
          <Card key={s.label} className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-xl font-semibold">{s.value}</p></CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item}>
          <Card className="hover:border-primary/20 transition-colors">
            <CardContent className="pt-4 sm:pt-6 flex items-center gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs sm:text-sm font-medium">Family members</p>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{data.members.length} total</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: "100%" }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Active</p>
                <p className="text-base sm:text-lg font-semibold">{data.members.filter((m: any) => m.status === "ACTIVE").length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="lg:col-span-2">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Family members</CardTitle>
              <Badge variant="secondary" className="text-[11px]">{members.length} profiles</Badge>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">No family members yet.</p>
                  <Button size="sm" onClick={openCreateMember}><Plus className="mr-1 h-3 w-3" /> Add member</Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[420px]">
                  <div className="space-y-2 pt-1">
                    {members.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-3 gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9"><AvatarFallback>{m.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role]}{m.device ? ` · ${m.device}` : ""}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Screen time today: {formatMinutes(m.screenTimeMinutesToday)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[m.status]}</Badge>
                            <Badge variant={m.locationSharing ? "secondary" : "outline"} className="text-[10px]">{m.locationSharing ? "Location on" : "Location off"}</Badge>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditMember(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteMember.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Safety controls</CardTitle>
              <Button size="sm" onClick={() => setControlOpen(true)} className="text-xs sm:text-sm"><Plus className="mr-1 h-3 w-3" /> Add</Button>
            </CardHeader>
            <CardContent>
              {data.controls.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No safety controls yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.controls.map((control: any) => (
                    <div key={control.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-2 sm:p-3">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{control.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{control.type} · {control.status}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => deleteControl.mutate(control.id)}><Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {pendingInvites.length > 0 && (
            <Card className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Pending invites</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingInvites.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm truncate">{inv.email}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{ROLE_LABELS[inv.role]} · expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => revokeInvite.mutate(inv.id)}><XCircle className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Family insight</CardTitle></CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{insight}</p></CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm sm:text-base">Add family member</DialogTitle></DialogHeader>
          <form onSubmit={handleMemberSubmit} className="space-y-4 pt-2">
            <div className="space-y-1"><Label className="text-[10px] sm:text-xs">Name</Label><Input value={memberForm.name} onChange={(e) => setMemberForm((f) => ({ ...f, name: e.target.value }))} required className="text-xs sm:text-sm" /></div>
            <div className="space-y-1"><Label className="text-[10px] sm:text-xs">Role</Label>
              <select className="flex h-8 sm:h-9 w-full rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" value={memberForm.role} onChange={(e) => setMemberForm((f) => ({ ...f, role: e.target.value }))}>
                {Object.keys(ROLE_LABELS).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select></div>
            <div className="space-y-1"><Label className="text-[10px] sm:text-xs">Device (optional)</Label><Input placeholder="e.g. iPhone 15, iPad" value={memberForm.device} onChange={(e) => setMemberForm((f) => ({ ...f, device: e.target.value }))} className="text-xs sm:text-sm" /></div>
            {editingMemberId && (
              <>
                <div className="space-y-1"><Label className="text-[10px] sm:text-xs">Status</Label>
                  <select className="flex h-8 sm:h-9 w-full rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" value={memberForm.status} onChange={(e) => setMemberForm((f) => ({ ...f, status: e.target.value }))}>
                    {Object.keys(STATUS_LABELS).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select></div>
                <div className="space-y-1"><Label className="text-[10px] sm:text-xs">Screen time today (minutes)</Label><Input type="number" min={0} value={memberForm.screenTimeMinutesToday} onChange={(e) => setMemberForm((f) => ({ ...f, screenTimeMinutesToday: Number(e.target.value) }))} className="text-xs sm:text-sm" /></div>
                <div className="space-y-1">
                  <Label>Screen time today (minutes)</Label>
                  <Input type="number" min={0} value={memberForm.screenTimeMinutesToday} onChange={(e) => setMemberForm((f) => ({ ...f, screenTimeMinutesToday: Number(e.target.value) }))} />
                </div>
              </>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={memberForm.locationSharing} onCheckedChange={(checked) => setMemberForm((f) => ({ ...f, locationSharing: !!checked }))} />
              <span className="text-sm">Location sharing enabled</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMemberOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMember.isPending || updateMember.isPending}>{createMember.isPending || updateMember.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={controlOpen} onOpenChange={setControlOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add safety control</DialogTitle></DialogHeader>
          <form onSubmit={handleControlSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input placeholder="e.g. Screen time limit" value={controlForm.title} onChange={(e) => setControlForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Applies to</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={controlForm.memberId} onChange={(e) => setControlForm((f) => ({ ...f, memberId: e.target.value }))}>
                <option value="">All members</option>
                {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Value (optional)</Label>
              <Input placeholder="e.g. 2 hours/day, 9:00 PM" value={controlForm.value} onChange={(e) => setControlForm((f) => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input value={controlForm.description} onChange={(e) => setControlForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={controlForm.enabled} onCheckedChange={(checked) => setControlForm((f) => ({ ...f, enabled: !!checked }))} />
              <span className="text-sm">Enabled</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setControlOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createControl.isPending}>{createControl.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}