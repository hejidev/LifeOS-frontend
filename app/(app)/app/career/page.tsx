"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Target, Sparkles, Plus, Pencil, Trash2, Award, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useCareerDashboard, useCreateCareerGoal, useUpdateCareerGoal, useDeleteCareerGoal,
  useCreateSkill, useUpdateSkill, useDeleteSkill,
  useCreateAchievement, useDeleteAchievement,
} from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const AREA_LABELS: Record<string, string> = { SKILLS: "Skills", ROLE: "Role", PROJECT: "Project", CERTIFICATION: "Certification" };
const GOAL_STATUS_CONFIG: Record<string, { label: string; variant: any }> = {
  NOT_STARTED: { label: "Not started", variant: "outline" },
  IN_PROGRESS: { label: "In progress", variant: "default" },
  COMPLETED: { label: "Completed", variant: "secondary" },
  ON_HOLD: { label: "On hold", variant: "outline" },
};
const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const ACHIEVEMENT_TYPES = ["CERTIFICATION", "AWARD", "PROMOTION", "PUBLICATION", "OTHER"];

const emptyGoalForm = { title: "", area: "SKILLS", status: "NOT_STARTED", progress: 0, targetDate: "", notes: "" };
const emptySkillForm = { name: "", level: "BEGINNER", progress: 0, category: "" };
const emptyAchievementForm = { title: "", type: "CERTIFICATION", issuer: "", date: "", description: "", credentialUrl: "" };

export default function CareerPage() {
  const { data, isLoading } = useCareerDashboard();
  const createGoal = useCreateCareerGoal();
  const updateGoal = useUpdateCareerGoal();
  const deleteGoal = useDeleteCareerGoal();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();
  const createAchievement = useCreateAchievement();
  const deleteAchievement = useDeleteAchievement();

  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState(emptyGoalForm);

  const [skillOpen, setSkillOpen] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState(emptySkillForm);

  const [achievementOpen, setAchievementOpen] = useState(false);
  const [achievementForm, setAchievementForm] = useState(emptyAchievementForm);

  if (isLoading || !data) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  const { goals, skills, achievements, stats, insight } = data as any;

  function openCreateGoal() {
    setEditingGoalId(null);
    setGoalForm(emptyGoalForm);
    setGoalOpen(true);
  }
  function openEditGoal(g: any) {
    setEditingGoalId(g.id);
    setGoalForm({ title: g.title, area: g.area, status: g.status, progress: g.progress, targetDate: g.targetDate ? g.targetDate.split("T")[0] : "", notes: g.notes ?? "" });
    setGoalOpen(true);
  }
  function handleGoalSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: goalForm.title, area: goalForm.area, status: goalForm.status, progress: Number(goalForm.progress),
      targetDate: goalForm.targetDate ? new Date(goalForm.targetDate).toISOString() : undefined,
      notes: goalForm.notes || undefined,
    };
    if (editingGoalId) {
      updateGoal.mutate({ id: editingGoalId, data: payload }, { onSuccess: () => setGoalOpen(false) });
    } else {
      createGoal.mutate(payload as any, { onSuccess: () => setGoalOpen(false) });
    }
  }

  function openCreateSkill() {
    setEditingSkillId(null);
    setSkillForm(emptySkillForm);
    setSkillOpen(true);
  }
  function openEditSkill(s: any) {
    setEditingSkillId(s.id);
    setSkillForm({ name: s.name, level: s.level, progress: s.progress, category: s.category ?? "" });
    setSkillOpen(true);
  }
  function handleSkillSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: skillForm.name, level: skillForm.level, progress: Number(skillForm.progress), category: skillForm.category || undefined };
    if (editingSkillId) {
      updateSkill.mutate({ id: editingSkillId, data: payload }, { onSuccess: () => setSkillOpen(false) });
    } else {
      createSkill.mutate(payload, { onSuccess: () => setSkillOpen(false) });
    }
  }

  function handleAchievementSubmit(e: React.FormEvent) {
    e.preventDefault();
    createAchievement.mutate(
      {
        title: achievementForm.title, type: achievementForm.type,
        issuer: achievementForm.issuer || undefined,
        date: achievementForm.date ? new Date(achievementForm.date).toISOString() : undefined,
        description: achievementForm.description || undefined,
        credentialUrl: achievementForm.credentialUrl || undefined,
      },
      { onSuccess: () => { setAchievementOpen(false); setAchievementForm(emptyAchievementForm); } }
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" /> Career
          </h1>
          <p className="text-muted-foreground mt-1 text-[10px] sm:text-xl">Track goals, skills, and achievements toward your career growth.</p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={openCreateSkill} className="px-5 w-23 sm:w-40 text-[13px] sm:text-xl ml-2">
          <Plus className="h-3 w-3 sm:w-4 sm:h-4" /> Skill</Button>
          <Button onClick={openCreateGoal} className="px-5 w-23 sm:w-40 text-[13px] sm:text-xl ml-2">
          <Plus className="h-3 w-3 sm:w-4 sm:h-4" /> Goal</Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active goals", value: stats.activeGoals },
          { label: "Completed", value: stats.completedGoals },
          { label: "Overdue", value: stats.overdueGoals },
          { label: "Avg skill progress", value: `${stats.avgSkillProgress}%` },
        ].map((s) => (
          <Card key={s.label} className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-semibold">{s.value}</p></CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Career goals
              </CardTitle>
              <Badge variant="secondary" className="text-[11px]">{goals.length} goals</Badge>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">No goals yet.</p>
                  <Button size="sm" onClick={openCreateGoal}><Plus className="mr-1 h-3 w-3" /> Add goal</Button>
                </div>
              ) : (
                <ScrollArea className="max-h-105">
                  <div className="space-y-3 pt-1">
                    {goals.map((g: any) => {
                      const cfg = GOAL_STATUS_CONFIG[g.status] ?? GOAL_STATUS_CONFIG.NOT_STARTED;
                      const overdue = g.targetDate && new Date(g.targetDate) < new Date() && g.status !== "COMPLETED";
                      return (
                        <div key={g.id} className="space-y-2 rounded-lg border border-border/60 bg-card/60 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{g.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">{AREA_LABELS[g.area]}</Badge>
                                <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                                {overdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                                {g.targetDate && <span className="text-[11px] text-muted-foreground">Target {new Date(g.targetDate).toLocaleDateString()}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditGoal(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteGoal.mutate(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${g.progress}%` }} />
                          </div>
                          {g.notes && <p className="text-[11px] text-muted-foreground">{g.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Skills</CardTitle>
              <Button size="sm" variant="ghost" onClick={openCreateSkill}><Plus className="h-3 w-3" /></Button>
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No skills tracked yet.</p>
              ) : (
                <div className="space-y-3">
                  {skills.map((s: any) => (
                    <div key={s.id} className="space-y-1 rounded-lg border border-border/60 bg-card/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{s.level.toLowerCase()}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-[10px]">{s.progress}%</Badge>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditSkill(s)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => deleteSkill.mutate(s.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${s.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Achievements</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setAchievementOpen(true)}><Plus className="h-3 w-3" /></Button>
            </CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No achievements logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {achievements.map((a: any) => (
                    <div key={a.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-card/60 p-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.type.charAt(0) + a.type.slice(1).toLowerCase()}{a.issuer ? ` · ${a.issuer}` : ""}{a.date ? ` · ${new Date(a.date).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => deleteAchievement.mutate(a.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Career insight</CardTitle></CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{insight}</p></CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="max-w-70 sm:max-w-xl px-2 sm:px-5 mt-3 max-h-[90vh] flex flex-col gap-1">
          <DialogHeader className="shrink-0"><DialogTitle className="text-start mb-0">{editingGoalId ? "Edit goal" : "Add career goal"}</DialogTitle></DialogHeader>
          <form onSubmit={handleGoalSubmit} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 max-h-[60vh] pr-3">
              <div className="space-y-2 pt-2 pb-2">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={goalForm.title} onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Area</Label>
                  <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={goalForm.area} onChange={(e) => setGoalForm((f) => ({ ...f, area: e.target.value }))}>
                    {Object.keys(AREA_LABELS).map((a) => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
                  </select>
                </div>
                {editingGoalId && (
                  <>
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={goalForm.status} onChange={(e) => setGoalForm((f) => ({ ...f, status: e.target.value }))}>
                        {Object.keys(GOAL_STATUS_CONFIG).map((s) => <option key={s} value={s}>{GOAL_STATUS_CONFIG[s].label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between"><Label>Progress</Label><span className="text-xs text-muted-foreground">{goalForm.progress}%</span></div>
                      <input type="range" min={0} max={100} step={5} value={goalForm.progress} onChange={(e) => setGoalForm((f) => ({ ...f, progress: Number(e.target.value) }))} className="w-full accent-primary" />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <Label>Target date (optional)</Label>
                  <Input type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Notes (optional)</Label>
                  <Textarea rows={3} value={goalForm.notes} onChange={(e) => setGoalForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-3 border-t border-border mt-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => setGoalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createGoal.isPending || updateGoal.isPending}>{createGoal.isPending || updateGoal.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={skillOpen} onOpenChange={setSkillOpen}>
        <DialogContent className="max-w-70 sm:max-w-xl px-2 sm:px-5">
          <DialogHeader><DialogTitle>{editingSkillId ? "Edit skill" : "Add skill"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSkillSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={skillForm.name} onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Level</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={skillForm.level} onChange={(e) => setSkillForm((f) => ({ ...f, level: e.target.value }))}>
                {SKILL_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between"><Label>Progress</Label><span className="text-xs text-muted-foreground">{skillForm.progress}%</span></div>
              <input type="range" min={0} max={100} step={5} value={skillForm.progress} onChange={(e) => setSkillForm((f) => ({ ...f, progress: Number(e.target.value) }))} className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <Label>Category (optional)</Label>
              <Input placeholder="e.g. Engineering, Design" value={skillForm.category} onChange={(e) => setSkillForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSkillOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createSkill.isPending || updateSkill.isPending}>{createSkill.isPending || updateSkill.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={achievementOpen} onOpenChange={setAchievementOpen}>
        <DialogContent className="max-w-70 sm:max-w-xl px-2 sm:px-5 mt-3 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0"><DialogTitle>Add achievement</DialogTitle></DialogHeader>
          <form onSubmit={handleAchievementSubmit} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 max-h-[60vh] pr-3">
              <div className="space-y-4 pt-2 pb-2">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={achievementForm.title} onChange={(e) => setAchievementForm((f) => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={achievementForm.type} onChange={(e) => setAchievementForm((f) => ({ ...f, type: e.target.value }))}>
                    {ACHIEVEMENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Issuer (optional)</Label>
                  <Input placeholder="e.g. AWS, Google" value={achievementForm.issuer} onChange={(e) => setAchievementForm((f) => ({ ...f, issuer: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Date (optional)</Label>
                  <Input type="date" value={achievementForm.date} onChange={(e) => setAchievementForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Credential URL (optional)</Label>
                  <Input placeholder="https://..." value={achievementForm.credentialUrl} onChange={(e) => setAchievementForm((f) => ({ ...f, credentialUrl: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Description (optional)</Label>
                  <Textarea rows={2} value={achievementForm.description} onChange={(e) => setAchievementForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-3 border-t border-border mt-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => setAchievementOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createAchievement.isPending}>{createAchievement.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}