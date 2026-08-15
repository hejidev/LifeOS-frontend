"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Plus, Search, Folder, Lock,
  Tag, FileText, Sparkles, Trash2, Archive, Link2, Upload,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument,
  useUploadDocumentFile,
} from "@/lib/hooks/use-life-data";
import type { VaultDocument } from "@/types/life";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const CATEGORIES = ["IDENTITY", "LEGAL", "EDUCATION", "FINANCE", "HEALTH", "WORK", "PERSONAL", "OTHER"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  IDENTITY: "Identity", LEGAL: "Legal", EDUCATION: "Education",
  FINANCE: "Finance", HEALTH: "Health", WORK: "Work",
  PERSONAL: "Personal", OTHER: "Other",
};

const emptyForm = {
  title: "",
  category: "OTHER" as typeof CATEGORIES[number],
  fileUrl: "",
  fileName: "",
  tags: "",
  summary: "",
  expiresAt: "",
};

function guessCategoryFromMime(mimeType: string): typeof CATEGORIES[number] {
  if (mimeType.startsWith("image/")) return "PERSONAL";
  return "OTHER";
}

export default function DocumentsPage() {
  const { documents, stats, isLoading } = useDocuments();
  const createDoc = useCreateDocument();
  const updateDoc = useUpdateDocument();
  const deleteDoc = useDeleteDocument();
  const uploadFile = useUploadDocumentFile();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mode, setMode] = useState<"link" | "upload">("link");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (documents as VaultDocument[]).filter((d) => {
      const matchCat = categoryFilter === "all" || d.category.toUpperCase() === categoryFilter;
      const matchSearch = !q || d.title.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [documents, search, categoryFilter]);

  const selected = filtered.find((d) => d.id === selectedId) ?? filtered[0] ?? null;

  function resetDialog() {
    setUploadOpen(false);
    setMode("link");
    setPickedFile(null);
    setForm(emptyForm);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedFile(file);
    setForm((f) => ({
      ...f,
      title: f.title || file.name.replace(/\.[^/.]+$/, ""),
      category: f.category === "OTHER" ? guessCategoryFromMime(file.type) : f.category,
    }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    const finalize = (fileUrl?: string, fileName?: string, fileType?: string, fileSize?: number) => {
      createDoc.mutate(
        {
          title: form.title,
          category: form.category,
          fileUrl: fileUrl ?? (form.fileUrl || undefined),
          fileName: fileName ?? (form.fileName || undefined),
          fileType,
          fileSize,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          summary: form.summary || undefined,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        },
        { onSuccess: resetDialog }
      );
    };

    if (mode === "upload") {
      if (!pickedFile) return;
      uploadFile.mutate(pickedFile, {
        onSuccess: (fileData) => finalize(fileData.fileUrl, fileData.fileName, fileData.fileType, fileData.fileSize),
      });
      return;
    }

    finalize();
  }

  const isSubmitting = uploadFile.isPending || createDoc.isPending;

  if (isLoading) return <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Document Center
          </h1>
          <p className="text-muted-foreground mt-1">Secure vault for IDs, certificates, and important files.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add document
        </Button>
      </motion.div>

      {stats && (
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.totalDocuments },
            { label: "Active", value: stats.activeDocuments },
            { label: "Archived", value: stats.archivedDocuments },
            { label: "Expired", value: stats.expiredDocuments },
            { label: "Expiring soon", value: stats.expiringSoon },
          ].map((s) => (
            <Card key={s.label} className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-semibold">{s.value}</p></CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="flex flex-col md:flex-row gap-3 items-start md:items-center flex-wrap">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title or tag..." className="pl-8" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          <Button size="sm" variant={categoryFilter === "all" ? "default" : "outline"}
            onClick={() => setCategoryFilter("all")}>All</Button>
          {CATEGORIES.map((cat) => (
            <Button key={cat} size="sm" variant={categoryFilter === cat ? "default" : "outline"}
              onClick={() => setCategoryFilter(cat)}>{CATEGORY_LABELS[cat]}</Button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> All Documents
              </CardTitle>
              <Badge variant="secondary" className="text-[11px]">{filtered.length} items</Badge>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">No documents yet.</p>
                  <Button size="sm" onClick={() => setUploadOpen(true)}>
                    <Plus className="mr-1 h-3 w-3" /> Add document
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[420px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {filtered.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedId(doc.id)}
                        className={cn(
                          "group rounded-lg border border-border/60 bg-card/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-card",
                          selected?.id === doc.id && "border-primary/60 bg-card"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-medium truncate">{doc.title}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {CATEGORY_LABELS[doc.category.toUpperCase()] ?? doc.category}
                            </Badge>
                          </div>
                          <Lock className="h-4 w-4 text-primary shrink-0" />
                        </div>
                        {doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] flex items-center gap-1">
                                <Tag className="h-3 w-3" />{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Added {format(new Date(doc.createdAt), "MMM d, yyyy")}
                          {doc.expiresAt && ` · Expires ${format(new Date(doc.expiresAt), "MMM d, yyyy")}`}
                        </p>
                      </button>
                    ))}
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
                <ShieldCheck className="h-4 w-4 text-primary" /> Document Detail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selected ? (
                <>
                  <div>
                    <p className="font-medium">{selected.title}</p>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {CATEGORY_LABELS[selected.category.toUpperCase()] ?? selected.category}
                      {" · "}<Badge variant="outline" className="text-[10px]">{selected.status}</Badge>
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Added: {format(new Date(selected.createdAt), "MMM d, yyyy")}</p>
                    {selected.expiresAt && <p>Expires: {format(new Date(selected.expiresAt), "MMM d, yyyy")}</p>}
                    {selected.fileName && <p>File: {selected.fileName}</p>}
                    {selected.fileSize && <p>Size: ~{Math.round(selected.fileSize / 1024)} KB</p>}
                  </div>
                  {selected.summary && <p className="text-xs text-muted-foreground">{selected.summary}</p>}
                  {selected.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selected.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                    </div>
                  )}
                  {selected.fileUrl && (
                    <a href={selected.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> View file
                    </a>
                  )}
                  <div className="flex gap-2 pt-2 flex-wrap">
                    {selected.status === "ACTIVE" && (
                      <Button size="sm" variant="outline"
                        onClick={() => updateDoc.mutate({ id: selected.id, data: { status: "ARCHIVED" } })}>
                        <Archive className="h-3 w-3 mr-1" /> Archive
                      </Button>
                    )}
                    <Button size="sm" variant="destructive"
                      onClick={() => { deleteDoc.mutate(selected.id); setSelectedId(null); }}
                      disabled={deleteDoc.isPending}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a document to see details.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>Future AI features will surface expiry alerts, suggest task creation for renewals, and summarize long contracts.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={(open) => (open ? setUploadOpen(true) : resetDialog())}>
        <DialogContent className="max-w-md transition-colors h-[450px] sm:h-[550px] flex flex-col">
          <DialogHeader className="shrink-0 flex justify-between items-start"><DialogTitle className="mt-2 sm:mt-0">Add document</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 max-h-full pr-1">
              <div className="space-y-4 pt-2 pb-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={mode === "link" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => { setMode("link"); setPickedFile(null); }}
                  >
                    <Link2 className="mr-1 h-3 w-3" /> Link
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "upload" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setMode("upload")}
                  >
                    <Upload className="mr-1 h-3 w-3" /> Upload file
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input placeholder="e.g. International Passport" value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
                </div>

                <div className="space-y-1">
                  <Label>Category</Label>
                  <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>

                {mode === "link" ? (
                  <div className="space-y-1" key="link-field">
                    <Label>File URL</Label>
                    <Input
                      key="url-input"
                      placeholder="https://..."
                      value={form.fileUrl}
                      onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-1" key="upload-field">
                    <Label>File</Label>
                    <Input
                      key="file-input"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleFileSelect}
                      required
                    />
                    {pickedFile && (
                      <p className="text-[11px] text-muted-foreground">
                        {pickedFile.name} · {(pickedFile.size / 1024).toFixed(0)} KB
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Tags (comma separated)</Label>
                  <Input placeholder="ID, Travel, Official" value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Summary (optional)</Label>
                  <Textarea placeholder="Brief description of this document..." value={form.summary} rows={2}
                    onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Expiry date (optional)</Label>
                  <Input type="date" value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
                </div>

                {uploadFile.error && <p className="text-xs text-destructive">{(uploadFile.error as Error).message}</p>}
                {createDoc.error && <p className="text-xs text-destructive">{(createDoc.error as Error).message}</p>}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-3 border-t border-border mt-2 shrink-0">
              <Button type="button" variant="outline" onClick={resetDialog}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (uploadFile.isPending ? "Uploading..." : "Saving...") : "Save document"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}