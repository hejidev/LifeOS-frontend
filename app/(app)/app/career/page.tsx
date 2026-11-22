"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Award, Briefcase, Check, CheckCircle2, ExternalLink, Pencil, Plus, Sparkles, Target, Trash2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, ProgressBar, Section, StatCard } from "@/components/app/kit";
import {
  useCareerDashboard, useCreateAchievement, useCreateCareerGoal, useCreateSkill, useDeleteAchievement,
  useDeleteCareerGoal, useDeleteSkill, useUpdateCareerGoal, useUpdateSkill,
} from "@/lib/hooks/use-career";
import type { AchievementType, CareerGoal, CareerSkill, GoalArea, GoalStatus, SkillLevel } from "@/lib/hooks/use-career";
import { cn } from "@/lib/utils";

const AREAS: Record<GoalArea, string> = { SKILLS: "Skills", ROLE: "Role", PROJECT: "Project", CERTIFICATION: "Certification" };
const STATUSES: Record<GoalStatus, string> = { NOT_STARTED: "Not started", IN_PROGRESS: "In progress", COMPLETED: "Completed", ON_HOLD: "On hold" };
const LEVELS: SkillLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const ACHIEVEMENT_TYPES: AchievementType[] = ["CERTIFICATION", "AWARD", "PROMOTION", "PUBLICATION", "OTHER"];
const select = "flex h-10 w-full rounded-lg border bg-background px-3 text-sm";
const pretty = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");

function dueText(goal: CareerGoal) {
  if (!goal.targetDate) return null;
  const [year, month, day] = goal.targetDate.slice(0, 10).split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const label = target.toLocaleDateString(undefined, { dateStyle: "medium" });

  if (goal.status === "COMPLETED") return { text: `Target was ${label}`, tone: "text-muted-foreground" };
  if (days < 0) return { text: `${-days} ${days === -1 ? "day" : "days"} overdue`, tone: "text-destructive" };
  if (days === 0) return { text: "Due today", tone: "text-amber-600" };
  if (days <= 14) return { text: `Due in ${days} ${days === 1 ? "day" : "days"}`, tone: "text-amber-600" };
  return { text: `Target ${label}`, tone: "text-muted-foreground" };
}

function GoalDialog({ editing, onClose }: { editing: CareerGoal | null; onClose: () => void }) {
  const create = useCreateCareerGoal();
  const update = useUpdateCareerGoal();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: editing?.title ?? "",
    area: editing?.area ?? ("SKILLS" as GoalArea),
    status: editing?.status ?? ("NOT_STARTED" as GoalStatus),
    progress: editing?.progress ?? 0,
    targetDate: editing?.targetDate?.slice(0, 10) ?? "",
    notes: editing?.notes ?? "",
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const outcome = { onSuccess: onClose, onError: (err: Error) => setError(err.message) };
    const targetDate = form.targetDate ? `${form.targetDate}T12:00:00.000Z` : null;
    const notes = form.notes.trim();

    if (editing) {
      update.mutate({ id: editing.id, data: { title: form.title.trim(), area: form.area, status: form.status, progress: form.progress, targetDate, notes: notes || null } }, outcome);
    } else {
      create.mutate({ title: form.title.trim(), area: form.area, ...(targetDate ? { targetDate } : {}), ...(notes ? { notes } : {}) }, outcome);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit goal" : "New career goal"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1"><Label>Goal</Label><Input value={form.title} onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))} placeholder="e.g. Earn my AWS certification" maxLength={200} required autoFocus /></div>
          <div className={cn("grid gap-3", editing && "grid-cols-2")}>
            <div className="space-y-1"><Label>Area</Label><select className={select} value={form.area} onChange={(event) => setForm((f) => ({ ...f, area: event.target.value as GoalArea }))}>{(Object.keys(AREAS) as GoalArea[]).map((key) => <option key={key} value={key}>{AREAS[key]}</option>)}</select></div>
            {editing && (
              <div className="space-y-1">
                <Label>Status</Label>
                <select className={select} value={form.status} onChange={(event) => { const status = event.target.value as GoalStatus; setForm((f) => ({ ...f, status, progress: status === "COMPLETED" ? 100 : f.progress })); }}>
                  {(Object.keys(STATUSES) as GoalStatus[]).map((key) => <option key={key} value={key}>{STATUSES[key]}</option>)}
                </select>
              </div>
            )}
          </div>
          {editing && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><Label>Progress</Label><span className="tabular-nums text-muted-foreground">{form.progress}%</span></div>
              <input type="range" min={0} max={100} step={5} value={form.progress} className="w-full accent-primary" onChange={(event) => { const progress = Number(event.target.value); setForm((f) => ({ ...f, progress, status: progress === 100 ? "COMPLETED" : f.status === "COMPLETED" ? "IN_PROGRESS" : f.status })); }} />
            </div>
          )}
          <div className="space-y-1"><Label>Target date (optional)</Label><Input type="date" value={form.targetDate} onChange={(event) => setForm((f) => ({ ...f, targetDate: event.target.value }))} /></div>
          <div className="space-y-1"><Label>Notes (optional)</Label><Textarea rows={3} value={form.notes} maxLength={2000} onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))} /></div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending || !form.title.trim()}>{create.isPending || update.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SkillDialog({ editing, goals, onClose }: { editing: CareerSkill | null; goals: CareerGoal[]; onClose: () => void }) {
  const create = useCreateSkill();
  const update = useUpdateSkill();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    level: editing?.level ?? ("BEGINNER" as SkillLevel),
    progress: editing?.progress ?? 0,
    category: editing?.category ?? "",
    goalId: editing?.relatedGoalId ?? "",
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const outcome = { onSuccess: onClose, onError: (err: Error) => setError(err.message) };
    const category = form.category.trim();

    if (editing) {
      update.mutate({ id: editing.id, data: { name: form.name.trim(), level: form.level, progress: form.progress, category, relatedGoalId: form.goalId || null } }, outcome);
    } else {
      create.mutate({ name: form.name.trim(), level: form.level, progress: form.progress, ...(category ? { category } : {}), ...(form.goalId ? { relatedGoalId: form.goalId } : {}) }, outcome);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Edit skill" : "Add skill"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1"><Label>Skill</Label><Input value={form.name} onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))} maxLength={100} required autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Level</Label><select className={select} value={form.level} onChange={(event) => setForm((f) => ({ ...f, level: event.target.value as SkillLevel }))}>{LEVELS.map((level) => <option key={level} value={level}>{pretty(level)}</option>)}</select></div>
            <div className="space-y-1"><Label>Category</Label><Input value={form.category} onChange={(event) => setForm((f) => ({ ...f, category: event.target.value }))} placeholder="e.g. Engineering" maxLength={60} /></div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm"><Label>Progress</Label><span className="tabular-nums text-muted-foreground">{form.progress}%</span></div>
            <input type="range" min={0} max={100} step={5} value={form.progress} className="w-full accent-primary" onChange={(event) => setForm((f) => ({ ...f, progress: Number(event.target.value) }))} />
          </div>
          {goals.length > 0 && (
            <div className="space-y-1"><Label>Supports goal (optional)</Label><select className={select} value={form.goalId} onChange={(event) => setForm((f) => ({ ...f, goalId: event.target.value }))}><option value="">None</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || update.isPending || !form.name.trim()}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AchievementDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateAchievement();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", type: "CERTIFICATION" as AchievementType, issuer: "", date: "", credentialUrl: "", description: "" });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    let link = form.credentialUrl.trim();
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
    const issuer = form.issuer.trim();
    const description = form.description.trim();

    create.mutate(
      {
        title: form.title.trim(),
        type: form.type,
        ...(issuer ? { issuer } : {}),
        ...(form.date ? { date: `${form.date}T12:00:00.000Z` } : {}),
        ...(link ? { credentialUrl: link } : {}),
        ...(description ? { description } : {}),
      },
      { onSuccess: onClose, onError: (err: Error) => setError(err.message) }
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle>Add achievement</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))} maxLength={200} required autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Type</Label><select className={select} value={form.type} onChange={(event) => setForm((f) => ({ ...f, type: event.target.value as AchievementType }))}>{ACHIEVEMENT_TYPES.map((type) => <option key={type} value={type}>{pretty(type)}</option>)}</select></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.date} onChange={(event) => setForm((f) => ({ ...f, date: event.target.value }))} /></div>
          </div>
          <div className="space-y-1"><Label>Issuer (optional)</Label><Input value={form.issuer} onChange={(event) => setForm((f) => ({ ...f, issuer: event.target.value }))} placeholder="e.g. Google, University of Ibadan" maxLength={120} /></div>
          <div className="space-y-1"><Label>Credential link (optional)</Label><Input value={form.credentialUrl} onChange={(event) => setForm((f) => ({ ...f, credentialUrl: event.target.value }))} placeholder="https://..." /></div>
          <div className="space-y-1"><Label>Description (optional)</Label><Textarea rows={2} value={form.description} maxLength={2000} onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))} /></div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !form.title.trim()}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DialogState = { kind: "goal"; id: number; editing: CareerGoal | null } | { kind: "skill"; id: number; editing: CareerSkill | null } | { kind: "achievement"; id: number } | null;

export default function CareerPage() {
  const { data, isLoading, isError, refetch } = useCareerDashboard();
  const updateGoal = useUpdateCareerGoal();
  const deleteGoal = useDeleteCareerGoal();
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();
  const deleteAchievement = useDeleteAchievement();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [showDone, setShowDone] = useState(false);

  const goals = data?.goals;
  const { active, done } = useMemo(() => {
    const list = goals ?? [];
    return {
      active: list
        .filter((goal) => goal.status !== "COMPLETED")
        .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999")),
      done: list.filter((goal) => goal.status === "COMPLETED"),
    };
  }, [goals]);
  const goalTitle = useMemo(() => new Map((goals ?? []).map((goal) => [goal.id, goal.title])), [goals]);

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your career data.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-56" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const { stats } = data;

  const GoalCard = ({ goal }: { goal: CareerGoal }) => {
    const due = dueText(goal);
    const complete = goal.status === "COMPLETED";
    return (
      <div className={cn("space-y-3 rounded-xl border bg-card p-4", goal.overdue && "border-destructive/40")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-sm font-medium", complete && "text-muted-foreground line-through")}>{goal.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{AREAS[goal.area]}</Badge>
              <Badge variant={complete ? "secondary" : "outline"} className="text-[10px]">{STATUSES[goal.status]}</Badge>
              {due && <span className={cn("text-xs", due.tone)}>{due.text}</span>}
            </div>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit goal" onClick={() => setDialog({ kind: "goal", id: Date.now(), editing: goal })}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Delete goal" onClick={() => window.confirm(`Delete the goal "${goal.title}"?`) && deleteGoal.mutate(goal.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <ProgressBar value={goal.progress} tone={complete ? "success" : goal.overdue ? "danger" : "default"} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">{goal.progress}%</span>
            <div className="flex gap-1.5">
              {complete ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={updateGoal.isPending} onClick={() => updateGoal.mutate({ id: goal.id, data: { status: "IN_PROGRESS", progress: 90 } })}>Reopen</Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={updateGoal.isPending} onClick={() => updateGoal.mutate({ id: goal.id, data: { progress: Math.min(100, goal.progress + 10) } })}>+10%</Button>
                  <Button size="sm" className="h-7 text-xs" disabled={updateGoal.isPending} onClick={() => updateGoal.mutate({ id: goal.id, data: { status: "COMPLETED" } })}><Check className="mr-1 h-3 w-3" /> Complete</Button>
                </>
              )}
            </div>
          </div>
        </div>
        {goal.notes && <p className="text-xs text-muted-foreground">{goal.notes}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Briefcase}
        title="Career"
        subtitle="Goals, skills and achievements that move you forward."
        actions={
          <>
            <Button variant="outline" onClick={() => setDialog({ kind: "skill", id: Date.now(), editing: null })}><Plus className="mr-1.5 h-4 w-4" /> Skill</Button>
            <Button onClick={() => setDialog({ kind: "goal", id: Date.now(), editing: null })}><Plus className="mr-1.5 h-4 w-4" /> Goal</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Target} label="Active goals" value={stats.activeGoals} hint={`${stats.totalGoals} in total`} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completedGoals} tone="success" progress={stats.totalGoals ? (stats.completedGoals / stats.totalGoals) * 100 : 0} />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdueGoals} tone={stats.overdueGoals > 0 ? "danger" : "success"} hint={stats.overdueGoals > 0 ? "Needs a new date" : "On schedule"} />
        <StatCard icon={TrendingUp} label="Skill progress" value={`${stats.avgSkillProgress}%`} progress={stats.avgSkillProgress} hint={`${stats.totalSkills} ${stats.totalSkills === 1 ? "skill" : "skills"}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Goals" icon={Target}>
            {active.length === 0 && done.length === 0 ? (
              <EmptyState icon={Target} title="Set your first career goal" body="A certification, a promotion or a project. Pick one and track it here." action={<Button size="sm" onClick={() => setDialog({ kind: "goal", id: Date.now(), editing: null })}>Add a goal</Button>} />
            ) : (
              <div className="space-y-3">
                {active.map((goal) => <GoalCard key={goal.id} goal={goal} />)}
                {active.length === 0 && <p className="py-3 text-center text-sm text-muted-foreground">No active goals. Add a new one to keep going.</p>}
                {done.length > 0 && (
                  <>
                    <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setShowDone((value) => !value)}>{showDone ? "Hide" : "Show"} {done.length} completed</button>
                    {showDone && done.map((goal) => <GoalCard key={goal.id} goal={goal} />)}
                  </>
                )}
              </div>
            )}
          </Section>

          <Section title="Achievements" icon={Award} action={<Button size="sm" variant="outline" onClick={() => setDialog({ kind: "achievement", id: Date.now() })}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>}>
            {data.achievements.length === 0 ? (
              <EmptyState icon={Award} title="No achievements yet" body="Certificates, awards and promotions you earn show up here." />
            ) : (
              <div className="space-y-2">
                {data.achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"><Award className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {pretty(achievement.type)}{achievement.issuer ? ` · ${achievement.issuer}` : ""}{achievement.date ? ` · ${new Date(achievement.date).toLocaleDateString(undefined, { dateStyle: "medium" })}` : ""}
                      </p>
                      {achievement.description && <p className="mt-1 text-xs text-muted-foreground">{achievement.description}</p>}
                      {achievement.credentialUrl && /^https?:\/\//i.test(achievement.credentialUrl) && (
                        <a href={achievement.credentialUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" /> View credential</a>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" aria-label="Delete achievement" onClick={() => window.confirm(`Delete "${achievement.title}"?`) && deleteAchievement.mutate(achievement.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Skills" icon={TrendingUp} action={<Button size="sm" variant="outline" onClick={() => setDialog({ kind: "skill", id: Date.now(), editing: null })}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>}>
            {data.skills.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No skills tracked" body="Add the skills you're building and log practice as you go." />
            ) : (
              <div className="space-y-3">
                {data.skills.map((skill) => (
                  <div key={skill.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{skill.name}</p>
                        <p className="text-xs text-muted-foreground">{pretty(skill.level)}{skill.category ? ` · ${skill.category}` : ""}</p>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit skill" onClick={() => setDialog({ kind: "skill", id: Date.now(), editing: skill })}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Delete skill" onClick={() => window.confirm(`Delete the skill "${skill.name}"?`) && deleteSkill.mutate(skill.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <ProgressBar value={skill.progress} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-muted-foreground">
                        {skill.relatedGoalId && goalTitle.get(skill.relatedGoalId) ? `For: ${goalTitle.get(skill.relatedGoalId)}` : skill.lastPracticedAt ? `Practiced ${formatDistanceToNow(new Date(skill.lastPracticedAt), { addSuffix: true })}` : "Not practiced yet"}
                      </span>
                      <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" disabled={updateSkill.isPending} onClick={() => updateSkill.mutate({ id: skill.id, data: { lastPracticedAt: new Date().toISOString() } })}>Practiced today</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Insight" icon={Sparkles} className="border-primary/20 bg-primary/5">
            <p className="text-sm text-muted-foreground">{data.insight}</p>
          </Section>
        </div>
      </div>

      {dialog?.kind === "goal" && <GoalDialog key={dialog.id} editing={dialog.editing} onClose={() => setDialog(null)} />}
      {dialog?.kind === "skill" && <SkillDialog key={dialog.id} editing={dialog.editing} goals={active} onClose={() => setDialog(null)} />}
      {dialog?.kind === "achievement" && <AchievementDialog key={dialog.id} onClose={() => setDialog(null)} />}
    </div>
  );
}