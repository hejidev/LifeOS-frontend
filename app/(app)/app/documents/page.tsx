"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Plus, Search, Folder, Lock,
  Tag, FileText, Sparkles, Trash2, Archive, Link2, Upload,
  X,
  AlertCircle,
  HardDrive,
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
  type: "OTHER" as "PDF" | "IMAGE" | "VIDEO" | "AUDIO" | "OTHER",
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
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Documents
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Secure vault for your important documents and files.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="text-xs sm:text-sm">
          <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Add document
        </Button>
      </motion.div>

      {stats && (
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Total documents", value: stats.totalDocuments, icon: FileText },
            { label: "Expiring soon", value: stats.expiringSoon, icon: AlertCircle },
            { label: "Archived", value: stats.archivedDocuments, icon: Archive },
            { label: "Storage used", value: "--", icon: HardDrive },
          ].map((s) => (
            <Card key={s.label} className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-2 flex items-center justify-between">
                <CardTitle className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</CardTitle>
                <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </CardHeader>
              <CardContent><p className="text-lg sm:text-xl font-semibold">{s.value}</p></CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="flex flex-col md:flex-row gap-3 items-start md:items-center flex-wrap">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title or tag..." className="pl-8 text-xs sm:text-sm" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          <Button size="sm" variant={categoryFilter === "all" ? "default" : "outline"}
            onClick={() => setCategoryFilter("all")} className="text-xs sm:text-sm">All</Button>
          {CATEGORIES.map((cat) => (
            <Button key={cat} size="sm" variant={categoryFilter === cat ? "default" : "outline"}
              onClick={() => setCategoryFilter(cat)} className="text-xs sm:text-sm">{CATEGORY_LABELS[cat]}</Button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm sm:text-base">Your documents</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-32 sm:w-48 text-xs sm:text-sm" />
                <select className="h-8 sm:h-9 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No documents found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {filtered.map((doc) => (
                    <div key={doc.id} className="rounded-lg border border-border/60 bg-card/60 p-2 sm:p-3 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedId(doc.id)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{doc.category}</p>
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Added {format(new Date(doc.createdAt), "MMM d, yyyy")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <Card className="hover:border-primary/20 transition-colors">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">{selected?.title}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)} className="h-7 w-7 sm:h-auto sm:w-auto">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <Badge variant="outline" className="text-[10px] sm:text-xs">{selected?.category}</Badge>
                {selected?.expiresAt && <Badge variant="secondary" className="text-[10px] sm:text-xs">Expires {format(new Date(selected.expiresAt), "MMM d, yyyy")}</Badge>}
              </div>
              {selected?.fileUrl && (
                <div className="rounded-lg border border-border/60 bg-card/60 p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium mb-2">File</p>
                  <a href={selected.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary hover:underline">{selected.fileName}</a>
                </div>
              )}
              {selected?.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-[9px] sm:text-[10px]">{tag}</Badge>)}
                </div>
              )}
              <div className="flex gap-2 flex-col sm:flex-row">
                <Button size="sm" variant="outline" onClick={() => updateDoc.mutate({ id: selected?.id, data: { status: "ARCHIVED" } })} className="text-xs sm:text-sm">
                  <Archive className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> Archive
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteDoc.mutate(selected?.id)} className="text-xs sm:text-sm">
                  <Trash2 className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={(open) => (open ? setUploadOpen(true) : resetDialog())}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm sm:text-base">Add document</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <ScrollArea className="space-y-3 max-h-[60vh]">
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className="text-xs sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Category</Label>
              <select className="flex h-8 sm:h-9 w-full rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Type</Label>
              <select className="flex h-8 sm:h-9 w-full rounded-lg border border-input bg-background px-3 text-xs sm:text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}>
                {["PDF", "IMAGE", "VIDEO", "AUDIO", "OTHER"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Expiry date (optional)</Label>
              <Input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className="text-xs sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Tags (comma-separated)</Label>
              <Input placeholder="e.g. insurance, important" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className="text-xs sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">File upload</Label>
              <Input type="file" onChange={handleFileSelect} className="text-xs sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Or link URL</Label>
              <Input placeholder="https://..." value={form.fileUrl} onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))} className="text-xs sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Summary (optional)</Label>
              <Textarea placeholder="Brief description of this document..." value={form.summary} rows={2} className="text-xs sm:text-sm"
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
            </div>

            {uploadFile.error && <p className="text-xs text-destructive">{(uploadFile.error as Error).message}</p>}
            {createDoc.error && <p className="text-xs text-destructive">{(createDoc.error as Error).message}</p>}
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
    </motion.div >
  );
}