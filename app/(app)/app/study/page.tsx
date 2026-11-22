"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, CheckCircle2, Clock, ExternalLink, FileText, Flame, Link2, Lock, Pencil, Play, Plus, Search, Square, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FileDrop } from "@/components/app/file-drop";
import { EmptyState, PageHeader, ProgressBar, Section, StatCard } from "@/components/app/kit";
import { openProtectedFile } from "@/lib/api/client";
import {
  useCreateMaterial, useCreateSubject, useDeleteMaterial, useDeleteSubject, useEndSession, useStartSession,
  useStudyDashboard, useUpdateMaterial, useUploadMaterialFile,
} from "@/lib/hooks/use-study";
import type { ActiveSession, Material, MaterialStatus, MaterialType, Subject } from "@/lib/hooks/use-study";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<MaterialStatus, string> = { PLANNED: "Planned", IN_PROGRESS: "In progress", COMPLETED: "Completed", ON_HOLD: "On hold" };
const TYPE_LABEL: Record<MaterialType, string> = { BOOK: "Book", ARTICLE: "Article", VIDEO: "Video", COURSE: "Course", PODCAST: "Podcast", PDF: "PDF", NOTE: "Note", IMAGE: "Image", DOCUMENT: "Document" };
const SWATCHES = ["#6366f1", "#22c55e", "#f59e0b", "#0ea5e9", "#ec4899", "#ef4444", "#14b8a6", "#a855f7"];
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,.pdf,.doc,.docx,.ppt,.pptx,.txt";
const select = "flex h-10 w-full rounded-lg border bg-background px-3 text-sm";

const pad = (value: number) => String(value).padStart(2, "0");
const minutesText = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`);
const clockText = (ms: number) => {
  const total = Math.floor(ms / 1000);
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
};
const sizeText = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return startedAt ? Math.max(0, now - new Date(startedAt).getTime()) : 0;
}

function dueText(material: Material) {
  if (!material.targetDate || material.status === "COMPLETED") return null;
  const [year, month, day] = material.targetDate.slice(0, 10).split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(year, month - 1, day).getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { text: `${-days} ${days === -1 ? "day" : "days"} past target`, tone: "text-destructive" };
  if (days <= 7) return { text: days === 0 ? "Due today" : `Due in ${days} ${days === 1 ? "day" : "days"}`, tone: "text-amber-600" };
  return { text: `Target ${new Date(year, month - 1, day).toLocaleDateString(undefined, { dateStyle: "medium" })}`, tone: "text-muted-foreground" };
}

function SessionBar({ active, onStart, onEnd, busy, error }: { active: ActiveSession | null; onStart: (title: string) => void; onEnd: () => void; busy: boolean; error: string | null }) {
  const elapsed = useElapsed(active?.startedAt ?? null);
  const [title, setTitle] = useState("");

  if (active) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-3 w-3 rounded-full bg-primary" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{active.title}</p>
          <p className="text-xs text-muted-foreground">Studying now. This keeps running if you close the page.</p>
        </div>
        <p className="font-mono text-2xl font-semibold tabular-nums">{clockText(elapsed)}</p>
        <Button variant="destructive" onClick={onEnd} disabled={busy}><Square className="mr-1.5 h-4 w-4" /> {busy ? "Ending..." : "End session"}</Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (title.trim()) onStart(title.trim());
      }}
    >
      <Clock className="ml-1 h-4 w-4 shrink-0 text-primary" />
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What are you studying? Press Enter to start the timer" maxLength={200} className="h-10 min-w-[12rem] flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0" />
      <Button type="submit" disabled={busy || !title.trim()}><Play className="mr-1.5 h-4 w-4" /> Start</Button>
      {error && <p className="w-full px-1 text-xs text-destructive">{error}</p>}
    </form>
  );
}

function ProgressSlider({ value, disabled, onCommit }: { value: number; disabled: boolean; onCommit: (next: number) => void }) {
  const [draft, setDraft] = useState(value);
  const commit = () => draft !== value && onCommit(draft);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span className="tabular-nums">{draft}%</span></div>
      <input type="range" min={0} max={100} step={5} value={draft} disabled={disabled} onChange={(event) => setDraft(Number(event.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} className="w-full accent-primary" />
    </div>
  );
}

function SubjectDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateSubject();
  const [form, setForm] = useState({ name: "", color: SWATCHES[0], description: "" });
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add subject</DialogTitle></DialogHeader>
        <form
          className="space-y-3 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            const description = form.description.trim();
            create.mutate({ name: form.name.trim(), color: form.color, ...(description ? { description } : {}) }, { onSuccess: onClose, onError: (err: Error) => setError(err.message) });
          }}
        >
          <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))} placeholder="e.g. Computer Science" maxLength={100} required autoFocus /></div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((swatch) => <button key={swatch} type="button" aria-label={`Colour ${swatch}`} onClick={() => setForm((f) => ({ ...f, color: swatch }))} className={cn("h-7 w-7 rounded-full border-2", form.color === swatch ? "border-foreground" : "border-transparent")} style={{ backgroundColor: swatch }} />)}
            </div>
          </div>
          <div className="space-y-1"><Label>Description (optional)</Label><Input value={form.description} onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))} maxLength={500} /></div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !form.name.trim()}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaterialDialog({ editing, subjects, defaultSubjectId, onClose }: { editing: Material | null; subjects: Subject[]; defaultSubjectId: string; onClose: () => void }) {
  const create = useCreateMaterial();
  const update = useUpdateMaterial();
  const upload = useUploadMaterialFile();
  const [mode, setMode] = useState<"link" | "upload">("link");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: editing?.title ?? "",
    type: editing?.type ?? ("ARTICLE" as MaterialType),
    subjectId: editing?.subjectId ?? defaultSubjectId,
    url: editing?.url ?? "",
    notes: editing?.notes ?? "",
    targetDate: editing?.targetDate?.slice(0, 10) ?? "",
  });
  const busy = create.isPending || update.isPending || upload.isPending;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  function chooseFile(selected: File) {
    setError(null);
    setFile(selected);
    setForm((current) => ({
      ...current,
      title: current.title || selected.name.replace(/\.[^/.]+$/, ""),
      type: selected.type.startsWith("image/") ? "IMAGE" : selected.type === "application/pdf" ? "PDF" : "DOCUMENT",
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    let url = form.url.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    const notes = form.notes.trim();
    const targetDate = form.targetDate ? `${form.targetDate}T12:00:00.000Z` : null;

    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: { title: form.title.trim(), type: form.type, subjectId: form.subjectId || null, notes: notes || null, targetDate, ...(editing.hasFile ? {} : { url: url || null }) },
        });
      } else {
        let attachment: Record<string, unknown> = {};
        if (mode === "upload") {
          if (!file) return setError("Choose a file to upload.");
          attachment = await upload.mutateAsync(file);
        } else if (url) {
          attachment = { url };
        }
        await create.mutateAsync({
          title: form.title.trim(),
          type: form.type,
          ...(form.subjectId ? { subjectId: form.subjectId } : {}),
          ...(notes ? { notes } : {}),
          ...(targetDate ? { targetDate } : {}),
          ...attachment,
        });
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit material" : "Add study material"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          {!editing && (
            <>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={mode === "link" ? "default" : "outline"} className="flex-1" onClick={() => { setMode("link"); setFile(null); }}><Link2 className="mr-1.5 h-3.5 w-3.5" /> Link</Button>
                <Button type="button" size="sm" variant={mode === "upload" ? "default" : "outline"} className="flex-1" onClick={() => setMode("upload")}><FileText className="mr-1.5 h-3.5 w-3.5" /> Upload file</Button>
              </div>
              {mode === "upload" &&
                (file ? (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{sizeText(file.size)} · stored privately</p></div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Remove file" onClick={() => setFile(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <FileDrop accept={ACCEPT} maxBytes={20 * 1024 * 1024} title="Drop a file or click to choose" hint="Images, PDF, Word, PowerPoint or text. Up to 20 MB." onFile={chooseFile} onReject={setError} />
                ))}
            </>
          )}
          <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="e.g. Introduction to Algorithms" maxLength={255} required autoFocus={!!editing} /></div>
          {(editing ? !editing.hasFile : mode === "link") && <div className="space-y-1"><Label>Link (optional)</Label><Input value={form.url} onChange={(event) => set("url", event.target.value)} placeholder="https://..." /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Type</Label><select className={select} value={form.type} onChange={(event) => set("type", event.target.value as MaterialType)}>{(Object.keys(TYPE_LABEL) as MaterialType[]).map((key) => <option key={key} value={key}>{TYPE_LABEL[key]}</option>)}</select></div>
            <div className="space-y-1"><Label>Subject</Label><select className={select} value={form.subjectId} onChange={(event) => set("subjectId", event.target.value)}><option value="">No subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div>
          </div>
          <div className="space-y-1"><Label>Target date (optional)</Label><Input type="date" value={form.targetDate} onChange={(event) => set("targetDate", event.target.value)} /></div>
          <div className="space-y-1"><Label>Notes (optional)</Label><Textarea rows={2} value={form.notes} maxLength={2000} onChange={(event) => set("notes", event.target.value)} /></div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || !form.title.trim()}>{upload.isPending ? "Uploading..." : busy ? "Saving..." : editing ? "Save changes" : "Add material"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StudyPage() {
  const { data, isLoading, isError, refetch } = useStudyDashboard();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const deleteSubject = useDeleteSubject();
  const startSession = useStartSession();
  const endSession = useEndSession();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<MaterialStatus | "all">("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [materialDialog, setMaterialDialog] = useState<{ id: number; editing: Material | null } | null>(null);
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const materials = data?.materials;
  const subjects = data?.subjects;
  const subjectMap = useMemo(() => new Map((subjects ?? []).map((subject) => [subject.id, subject])), [subjects]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (materials ?? []).filter((material) => {
      if (status !== "all" && material.status !== status) return false;
      if (subjectFilter !== "all" && material.subjectId !== subjectFilter) return false;
      return !needle || material.title.toLowerCase().includes(needle) || (material.notes ?? "").toLowerCase().includes(needle);
    });
  }, [materials, query, status, subjectFilter]);

  const selected = (materials ?? []).find((material) => material.id === selectedId) ?? null;

  function begin(title: string, material?: Material) {
    setSessionError(null);
    startSession.mutate(
      { title, ...(material ? { materialId: material.id } : {}), ...(material?.subjectId ? { subjectId: material.subjectId } : {}) },
      { onError: (err: Error) => setSessionError(err.message) }
    );
  }

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your study data.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { stats } = data;
  const chip = (active: boolean) => cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted");
  const detailDue = selected ? dueText(selected) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Study"
        subtitle="Materials, subjects and focused study sessions."
        actions={
          <>
            <Button variant="outline" onClick={() => setSubjectDialog(true)}><Plus className="mr-1.5 h-4 w-4" /> Subject</Button>
            <Button onClick={() => setMaterialDialog({ id: Date.now(), editing: null })}><Plus className="mr-1.5 h-4 w-4" /> Material</Button>
          </>
        }
      />

      <SessionBar active={data.activeSession} onStart={(title) => begin(title)} onEnd={() => data.activeSession && endSession.mutate({ id: data.activeSession.id })} busy={startSession.isPending || endSession.isPending} error={sessionError} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Clock} label="Studied this month" value={minutesText(stats.totalStudyMinutes)} />
        <StatCard icon={Flame} label="Study streak" value={`${stats.streakDays} ${stats.streakDays === 1 ? "day" : "days"}`} tone={stats.streakDays >= 3 ? "success" : "default"} hint={stats.streakDays === 0 ? "Study today to start one" : "Keep it going"} />
        <StatCard icon={BookOpen} label="In progress" value={stats.inProgressMaterials} hint={`${stats.totalMaterials} materials`} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completedMaterials} tone="success" progress={stats.totalMaterials ? (stats.completedMaterials / stats.totalMaterials) * 100 : 0} hint={stats.overdueMaterials > 0 ? `${stats.overdueMaterials} past target` : undefined} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search materials" className="h-9 pl-9" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            <button type="button" className={chip(status === "all")} onClick={() => setStatus("all")}>All</button>
            {(Object.keys(STATUS_LABEL) as MaterialStatus[]).map((key) => <button key={key} type="button" className={chip(status === key)} onClick={() => setStatus(key)}>{STATUS_LABEL[key]}</button>)}
          </div>
        </div>
        {data.subjects.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button type="button" className={chip(subjectFilter === "all")} onClick={() => setSubjectFilter("all")}>All subjects</button>
            {data.subjects.map((subject) => (
              <span key={subject.id} className={chip(subjectFilter === subject.id)}>
                <button type="button" className="flex items-center gap-1.5" onClick={() => setSubjectFilter(subjectFilter === subject.id ? "all" : subject.id)}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color ?? "#a1a1aa" }} /> {subject.name} <span className="opacity-60">{subject.materialCount}</span>
                </button>
                <button type="button" aria-label={`Delete ${subject.name}`} className="opacity-50 hover:text-destructive hover:opacity-100" onClick={() => window.confirm(`Delete the subject "${subject.name}"? Its materials stay, with no subject.`) && deleteSubject.mutate(subject.id, { onSuccess: () => setSubjectFilter("all") })}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={selected ? "lg:col-span-2" : "lg:col-span-3"}>
          {visible.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={data.materials.length === 0 ? "Add your first study material" : "Nothing matches"}
              body={data.materials.length === 0 ? "Books, courses, videos or files. Track each one and study with a timer." : "Try a different search or filter."}
              action={data.materials.length === 0 ? <Button size="sm" onClick={() => setMaterialDialog({ id: Date.now(), editing: null })}>Add material</Button> : undefined}
            />
          ) : (
            <div className={cn("grid gap-3 sm:grid-cols-2", !selected && "lg:grid-cols-3")}>
              {visible.map((material) => {
                const subject = material.subjectId ? subjectMap.get(material.subjectId) : undefined;
                const due = dueText(material);
                return (
                  <button key={material.id} type="button" onClick={() => { setSelectedId(material.id); setNotice(null); }} className={cn("space-y-2 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40", selectedId === material.id && "border-primary ring-1 ring-primary/40")}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{material.title}</span>
                        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          {subject && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: subject.color ?? "#a1a1aa" }} />}
                          {TYPE_LABEL[material.type]}{subject ? ` · ${subject.name}` : ""}
                        </span>
                      </span>
                      {material.isPrivate && <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </div>
                    <ProgressBar value={material.progress} tone={material.status === "COMPLETED" ? "success" : "default"} />
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-muted-foreground">{STATUS_LABEL[material.status]}{material.progress > 0 ? ` · ${material.progress}%` : ""}</span>
                      {due && <span className={due.tone}>{due.text}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <div className="lg:col-span-1">
            <Section title={selected.title} icon={BookOpen} action={<Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Close details" onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></Button>}>
              <p className="text-xs text-muted-foreground">{TYPE_LABEL[selected.type]}{selected.subjectId && subjectMap.get(selected.subjectId) ? ` · ${subjectMap.get(selected.subjectId)!.name}` : ""}</p>
              {detailDue && <p className={cn("text-sm", detailDue.tone)}>{detailDue.text}</p>}
              {selected.notes && <p className="text-sm text-muted-foreground">{selected.notes}</p>}

              {selected.hasFile ? (
                <div className="space-y-1.5 rounded-lg border p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium"><Lock className="h-3 w-3 text-primary" /> Private file</p>
                  {selected.fileName && <p className="truncate text-xs text-muted-foreground">{selected.fileName}{selected.fileSize ? ` · ${sizeText(selected.fileSize)}` : ""}</p>}
                  <Button size="sm" onClick={() => openProtectedFile(`/study/materials/${selected.id}/file`).catch((err) => setNotice(err.message))}>Open file</Button>
                </div>
              ) : selected.url ? (
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 truncate text-sm text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{selected.url.replace(/^https?:\/\//, "")}</span></a>
              ) : null}
              {notice && <p className="text-xs text-destructive">{notice}</p>}

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STATUS_LABEL) as MaterialStatus[]).map((key) => (
                    <Button key={key} size="sm" variant={selected.status === key ? "default" : "outline"} className="h-7 px-2 text-xs" disabled={updateMaterial.isPending} onClick={() => updateMaterial.mutate({ id: selected.id, data: { status: key } })}>{STATUS_LABEL[key]}</Button>
                  ))}
                </div>
              </div>

              <ProgressSlider
                key={`${selected.id}:${selected.progress}`}
                value={selected.progress}
                disabled={updateMaterial.isPending}
                onCommit={(next) => updateMaterial.mutate({ id: selected.id, data: { progress: next, ...(next === 100 ? { status: "COMPLETED" } : next > 0 && selected.status === "PLANNED" ? { status: "IN_PROGRESS" } : {}) } })}
              />

              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button size="sm" disabled={startSession.isPending} onClick={() => begin(`Study: ${selected.title}`, selected)}><Play className="mr-1.5 h-3.5 w-3.5" /> {data.activeSession ? "Switch session" : "Start session"}</Button>
                <Button size="sm" variant="outline" onClick={() => setMaterialDialog({ id: Date.now(), editing: selected })}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={deleteMaterial.isPending} onClick={() => window.confirm(`Delete "${selected.title}"?${selected.hasFile ? " Its file is removed too." : ""}`) && deleteMaterial.mutate(selected.id, { onSuccess: () => setSelectedId(null) })}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
              </div>
            </Section>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Recent sessions" icon={Clock} className="lg:col-span-2">
          {data.recentSessions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No sessions this month. Start the timer above.</p>
          ) : (
            <div className="space-y-2">
              {data.recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{session.title}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}</p></div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{session.endedAt ? minutesText(session.minutes ?? 0) : "Running"}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Insight" icon={Flame} className="border-primary/20 bg-primary/5"><p className="text-sm text-muted-foreground">{data.insight}</p></Section>
      </div>

      {materialDialog && <MaterialDialog key={materialDialog.id} editing={materialDialog.editing} subjects={data.subjects} defaultSubjectId={subjectFilter !== "all" ? subjectFilter : ""} onClose={() => setMaterialDialog(null)} />}
      {subjectDialog && <SubjectDialog onClose={() => setSubjectDialog(false)} />}
    </div>
  );
}