"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, FileText, Sparkles, Search, Plus,
  Clock, CheckCircle2, PlayCircle, StopCircle, Link2, Upload,
  Pencil, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useStudyMaterials, useStudySubjects, useStudyDashboard,
  useCreateStudyMaterial, useCreateStudySubject,
  useCreateStudySession, useEndStudySession,
  useUploadStudyMaterialFile,
  useUpdateStudyMaterial,
  useDeleteStudyMaterial,
} from "@/lib/hooks/use-life-data";
import type { StudyMaterial } from "@/types/life";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const STATUS_CONFIG = {
  PLANNED: { label: "Planned", variant: "outline" as const },
  IN_PROGRESS: { label: "In progress", variant: "default" as const },
  COMPLETED: { label: "Completed", variant: "secondary" as const },
  ON_HOLD: { label: "On hold", variant: "outline" as const },
};

const TYPE_LABELS: Record<string, string> = {
  BOOK: "Book", ARTICLE: "Article", VIDEO: "Video",
  COURSE: "Course", PODCAST: "Podcast", PDF: "PDF", NOTE: "Note",
  IMAGE: "Image", DOCUMENT: "Document",
};

function guessTypeFromMime(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType === "application/pdf") return "PDF";
  return "DOCUMENT";
}

const emptyMaterialForm = {
  title: "",
  type: "PDF",
  subjectId: "",
  url: "",
  notes: "",
};

export default function StudyPage() {
  const { data: dashboard, isLoading: dashLoading } = useStudyDashboard("month");
  const { data: materials = [], isLoading: matsLoading } = useStudyMaterials();
  const { data: subjects = [] } = useStudySubjects();
  const createMaterial = useCreateStudyMaterial();
  const updateMaterial = useUpdateStudyMaterial();
  const deleteMaterial = useDeleteStudyMaterial();
  const createSubject = useCreateStudySubject();
  const createSession = useCreateStudySession();
  const endSession = useEndStudySession();
  const uploadFile = useUploadStudyMaterialFile();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionStart, setActiveSessionStart] = useState<Date | null>(null);

  const [materialOpen, setMaterialOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [materialMode, setMaterialMode] = useState<"link" | "upload">("link");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [subjectForm, setSubjectForm] = useState({ name: "", color: "#6366f1", description: "" });
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (materials as StudyMaterial[]).filter((m) => {
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      const matchSearch = !q || m.title.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [materials, search, statusFilter]);

  const selected = filtered.find((m) => m.id === selectedId) ?? filtered[0] ?? null;

  function handleStartSession() {
    if (!selected) return;
    createSession.mutate(
      { title: `Study: ${selected.title}`, materialId: selected.id },
      {
        onSuccess: (data: any) => {
          setActiveSessionId(data.session?.id ?? null);
          setActiveSessionStart(new Date());
        },
      }
    );
  }

  function handleEndSession() {
    if (!activeSessionId) return;
    endSession.mutate(
      { id: activeSessionId, data: { endedAt: new Date().toISOString() } },
      {
        onSuccess: () => {
          setActiveSessionId(null);
          setActiveSessionStart(null);
        },
      }
    );
  }

  function resetMaterialDialog() {
    setMaterialOpen(false);
    setMaterialMode("link");
    setMaterialFile(null);
    setMaterialForm(emptyMaterialForm);
    setEditingMaterialId(null);
  }

  function openCreateMaterial() {
    setEditingMaterialId(null);
    setMaterialMode("link");
    setMaterialFile(null);
    setMaterialForm(emptyMaterialForm);
    setMaterialOpen(true);
  }

  function openEditMaterial(mat: StudyMaterial) {
    setEditingMaterialId(mat.id);
    setMaterialMode("link");
    setMaterialFile(null);
    setMaterialForm({
      title: mat.title,
      type: mat.type,
      subjectId: (mat as any).subjectId ?? "",
      url: (mat as any).url ?? "",
      notes: mat.notes ?? "",
    });
    setMaterialOpen(true);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMaterialFile(file);
    setMaterialForm((f) => ({
      ...f,
      type: guessTypeFromMime(file.type),
      title: f.title || file.name.replace(/\.[^/.]+$/, ""),
    }));
  }

  function handleMaterialSubmit(e: React.FormEvent) {
    e.preventDefault();

    const baseFields = {
      title: materialForm.title,
      type: materialForm.type,
      subjectId: materialForm.subjectId || undefined,
      notes: materialForm.notes || undefined,
    };

    const submit = (extra: {
      url?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    }) => {
      if (editingMaterialId) {
        updateMaterial.mutate(
          { id: editingMaterialId, data: { ...baseFields, ...extra } },
          { onSuccess: resetMaterialDialog }
        );
      } else {
        createMaterial.mutate(
          { ...baseFields, ...extra } as any,
          { onSuccess: resetMaterialDialog }
        );
      }
    };

    if (materialMode === "upload") {
      if (!materialFile) return;
      uploadFile.mutate(materialFile, {
        onSuccess: (fileData) =>
          submit({
            url: fileData.url,
            fileName: fileData.fileName,
            fileType: fileData.fileType,
            fileSize: fileData.fileSize,
          }),
      });
      return;
    }

    submit({ url: materialForm.url || undefined });
  }

  function handleDeleteMaterial(id: string) {
    deleteMaterial.mutate(id, {
      onSuccess: () => {
        if (selectedId === id) setSelectedId(null);
      },
    });
  }

  const isSubmitting = uploadFile.isPending || createMaterial.isPending || updateMaterial.isPending;

  if (dashLoading || matsLoading) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  const stats = dashboard?.stats;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Study
          </h1>
          <p className="text-muted-foreground mt-1">Track materials, subjects, and study sessions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSubjectOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Subject
          </Button>
          <Button onClick={openCreateMaterial}>
            <Plus className="mr-2 h-4 w-4" /> Material
          </Button>
        </div>
      </motion.div>

      {stats && (
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Subjects", value: stats.totalSubjects },
            { label: "Materials", value: stats.totalMaterials },
            { label: "Completed", value: stats.completedMaterials },
            { label: "Study time", value: `${stats.totalStudyMinutes}m` },
          ].map((s) => (
            <Card key={s.label} className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-semibold">{s.value}</p></CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search materials..." className="pl-8" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="md:ml-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="PLANNED">Planned</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS">In progress</TabsTrigger>
            <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="hover:border-primary/20 transition-colors h-[500px] flex flex-col">
            <CardHeader className="pb-3 flex items-center justify-between shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Study Materials
              </CardTitle>
              <Badge variant="secondary" className="text-[11px]">{filtered.length} items</Badge>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {filtered.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">No materials yet.</p>
                  <Button size="sm" onClick={openCreateMaterial}>
                    <Plus className="mr-1 h-3 w-3" /> Add material
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-2 pt-1">
                    {filtered.map((mat) => {
                      const cfg = STATUS_CONFIG[mat.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PLANNED;
                      const subj = (subjects as any[]).find((s) => s.id === (mat as any).subjectId);
                      return (
                        <button
                          key={mat.id}
                          type="button"
                          onClick={() => setSelectedId(mat.id)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-card",
                            selected?.id === mat.id && "border-primary/60 bg-card"
                          )}
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{mat.title}</p>
                              <Badge variant="outline" className="text-[10px] shrink-0">{TYPE_LABELS[mat.type] ?? mat.type}</Badge>
                            </div>
                            {subj && <p className="text-xs text-muted-foreground truncate">{subj.name}</p>}
                            <div className="flex items-center gap-2">
                              <Badge variant={cfg.variant} className="text-[10px] flex items-center gap-1">
                                {mat.status === "COMPLETED" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {cfg.label}
                              </Badge>
                              {(mat as any).fileName && (
                                <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                                  <Upload className="h-3 w-3" /> Uploaded
                                </Badge>
                              )}
                            </div>
                          </div>
                          {mat.progress > 0 && (
                            <div className="w-16 shrink-0 text-right">
                              <p className="text-[11px] text-muted-foreground">{mat.progress}%</p>
                              <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${mat.progress}%` }} />
                              </div>
                            </div>
                          )}
                        </button>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Selected material
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selected ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{selected.title}</p>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => openEditMaterial(selected)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteMaterial(selected.id)}
                        disabled={deleteMaterial.isPending}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{TYPE_LABELS[selected.type] ?? selected.type}</p>
                  {selected.notes && <p className="text-xs text-muted-foreground">{selected.notes}</p>}
                  {(selected as any).url && (
                    <a href={(selected as any).url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Open resource
                    </a>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="flex flex-wrap gap-1">
                      {(["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as const).map((s) => (
                        <Button
                          key={s}
                          type="button"
                          size="sm"
                          variant={selected.status === s ? "default" : "outline"}
                          className="text-[11px] h-7 px-2"
                          disabled={updateMaterial.isPending}
                          onClick={() => updateMaterial.mutate({ id: selected.id, data: { status: s } })}
                        >
                          {STATUS_CONFIG[s].label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {selected.status !== "PLANNED" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="text-xs text-muted-foreground">{selected.progress}%</p>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={selected.progress}
                        onChange={(e) =>
                          updateMaterial.mutate({ id: selected.id, data: { progress: Number(e.target.value) } })
                        }
                        className="w-full accent-primary"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex gap-2 flex-wrap">
                    {activeSessionId ? (
                      <Button size="sm" variant="destructive" onClick={handleEndSession} disabled={endSession.isPending}>
                        <StopCircle className="mr-1 h-3 w-3" />
                        {endSession.isPending ? "Ending..." : "End session"}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleStartSession} disabled={createSession.isPending}>
                        <PlayCircle className="mr-1 h-3 w-3" />
                        {createSession.isPending ? "Starting..." : "Start session"}
                      </Button>
                    )}
                  </div>
                  {activeSessionStart && (
                    <p className="text-[11px] text-muted-foreground">
                      Session started at {activeSessionStart.toLocaleTimeString()}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a material to start a study session.</p>
              )}
            </CardContent>
          </Card>

          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              {(subjects as any[]).length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No subjects yet.</p>
                  <Button size="sm" variant="outline" onClick={() => setSubjectOpen(true)}>
                    <Plus className="mr-1 h-3 w-3" /> Add subject
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {(subjects as any[]).map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 p-2">
                      {s.color && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />}
                      <p className="text-sm font-medium truncate">{s.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Study insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{dashboard?.insight ?? "Add materials and start sessions to see insights."}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={materialOpen} onOpenChange={(open) => (open ? setMaterialOpen(true) : resetMaterialDialog())}>
      <DialogContent className="max-w-md transition-colors h-[450px] sm:h-[550px] flex flex-col">
          <DialogHeader className="shrink-0 flex justify-between items-start">
            <DialogTitle className="mt-2 sm:mt-0">{editingMaterialId ? "Edit study material" : "Add study material"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMaterialSubmit} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 h-full pr-3">
              <div className="space-y-4 pt-2 pb-2">
                {!editingMaterialId && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={materialMode === "link" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => { setMaterialMode("link"); setMaterialFile(null); }}
                    >
                      <Link2 className="mr-1 h-3 w-3" /> Link
                    </Button>
                    <Button
                      type="button"
                      variant={materialMode === "upload" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setMaterialMode("upload")}
                    >
                      <Upload className="mr-1 h-3 w-3" /> Upload file
                    </Button>
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g. Introduction to Algorithms"
                    value={materialForm.title}
                    onChange={(e) => setMaterialForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>

                {materialMode === "link" ? (
                  <div className="space-y-1" key="link-field">
                    <Label>URL</Label>
                    <Input
                      key="url-input"
                      placeholder="https://..."
                      value={materialForm.url}
                      onChange={(e) => setMaterialForm((f) => ({ ...f, url: e.target.value }))}
                      required={!editingMaterialId}
                    />
                  </div>
                ) : (
                  <div className="space-y-1" key="upload-field">
                    <Label>File</Label>
                    <Input
                      key="file-input"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                      onChange={handleFileSelect}
                      required={!editingMaterialId}
                    />
                    {materialFile && (
                      <p className="text-[11px] text-muted-foreground">
                        {materialFile.name} · {(materialFile.size / 1024).toFixed(0)} KB
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Type</Label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={materialForm.type}
                    onChange={(e) => setMaterialForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    {Object.keys(TYPE_LABELS).map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Subject (optional)</Label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={materialForm.subjectId}
                    onChange={(e) => setMaterialForm((f) => ({ ...f, subjectId: e.target.value }))}
                  >
                    <option value="">No subject</option>
                    {(subjects as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="Quick note about this material"
                    value={materialForm.notes}
                    onChange={(e) => setMaterialForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                {uploadFile.error && (
                  <p className="text-xs text-destructive">{(uploadFile.error as Error).message}</p>
                )}
                {createMaterial.error && (
                  <p className="text-xs text-destructive">{(createMaterial.error as Error).message}</p>
                )}
                {updateMaterial.error && (
                  <p className="text-xs text-destructive">{(updateMaterial.error as Error).message}</p>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-3 border-t border-border mt-2 shrink-0">
              <Button type="button" variant="outline" onClick={resetMaterialDialog}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? (uploadFile.isPending ? "Uploading..." : "Saving...")
                  : editingMaterialId ? "Save changes" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Subject Dialog */}
      <Dialog open={subjectOpen} onOpenChange={setSubjectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add subject</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createSubject.mutate(
                { name: subjectForm.name, color: subjectForm.color, description: subjectForm.description || undefined },
                { onSuccess: () => { setSubjectOpen(false); setSubjectForm({ name: "", color: "#6366f1", description: "" }); } }
              );
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <Label>Subject name</Label>
              <Input
                placeholder="e.g. Computer Science"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Input
                type="color"
                value={subjectForm.color}
                onChange={(e) => setSubjectForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input
                placeholder="Brief description"
                value={subjectForm.description}
                onChange={(e) => setSubjectForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSubjectOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createSubject.isPending}>
                {createSubject.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}