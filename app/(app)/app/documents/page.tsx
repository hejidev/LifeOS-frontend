"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, Archive, FileText, Folder, FolderPlus, HardDrive, Link2, Lock, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FileDrop } from "@/components/app/file-drop";
import { EmptyState, PageHeader, Section, StatCard } from "@/components/app/kit";
import {
  useCreateDocument, useCreateDocumentFolder, useDeleteDocument, useDeleteDocumentFolder, useDocumentsDashboard,
  useUpdateDocument, useUpdateDocumentFolder, useUploadDocumentFile,
} from "@/lib/hooks/use-documents";
import { openProtectedFile } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { DocCategory, DocFolder, DocItem } from "@/types/documents";

const CATEGORIES: { key: DocCategory; label: string }[] = [
  { key: "IDENTITY", label: "Identity" }, { key: "LEGAL", label: "Legal" }, { key: "EDUCATION", label: "Education" },
  { key: "FINANCE", label: "Finance" }, { key: "HEALTH", label: "Health" }, { key: "WORK", label: "Work" },
  { key: "PERSONAL", label: "Personal" }, { key: "OTHER", label: "Other" },
];
const LABEL = Object.fromEntries(CATEGORIES.map((item) => [item.key, item.label])) as Record<DocCategory, string>;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.txt";
const MAX_BYTES = 20 * 1024 * 1024;

function bytes(value: number) {
  if (value >= 1_073_741_824) return `${(value / 1_073_741_824).toFixed(1)} GB`;
  if (value >= 1_048_576) return `${(value / 1_048_576).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function expiry(iso: string | null) {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `Expired ${-days} ${days === -1 ? "day" : "days"} ago`, tone: "danger" as const };
  if (days <= 30) return { text: days === 0 ? "Expires today" : `Expires in ${days} ${days === 1 ? "day" : "days"}`, tone: "warning" as const };
  return { text: `Expires ${new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" })}`, tone: "muted" as const };
}

const toneClass = { danger: "text-destructive", warning: "text-amber-600", muted: "text-muted-foreground" };
const parseTags = (value: string) => [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 20).map((tag) => tag.slice(0, 40));
const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const noon = (day: string) => new Date(`${day}T12:00:00`).toISOString();

function DocDialog({ editing, folders, onClose }: { editing: DocItem | null; folders: DocFolder[]; onClose: () => void }) {
  const create = useCreateDocument();
  const update = useUpdateDocument();
  const upload = useUploadDocumentFile();
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: editing?.title ?? "",
    category: editing?.category ?? ("OTHER" as DocCategory),
    folderId: editing?.folderId ?? "",
    expiresAt: dateInput(editing?.expiresAt ?? null),
    tags: editing?.tags.join(", ") ?? "",
    summary: editing?.summary ?? "",
    link: "",
  });
  const busy = create.isPending || update.isPending || upload.isPending;

  function chooseFile(selected: File) {
    setError(null);
    setFile(selected);
    setForm((current) => ({ ...current, title: current.title || selected.name.replace(/\.[^/.]+$/, "") }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const tags = parseTags(form.tags);
    const summary = form.summary.trim();

    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: {
            title: form.title.trim(),
            category: form.category,
            folderId: form.folderId || null,
            tags,
            summary: summary || null,
            expiresAt: form.expiresAt ? noon(form.expiresAt) : null,
          },
        });
      } else {
        let attachment: Record<string, unknown> = {};
        if (mode === "upload" && file) {
          attachment = await upload.mutateAsync(file);
        } else if (mode === "link" && form.link.trim()) {
          if (!/^https?:\/\//i.test(form.link.trim())) return setError("Links must start with http:// or https://");
          attachment = { fileUrl: form.link.trim() };
        }
        await create.mutateAsync({
          title: form.title.trim(),
          category: form.category,
          tags,
          ...(form.folderId ? { folderId: form.folderId } : {}),
          ...(summary ? { summary } : {}),
          ...(form.expiresAt ? { expiresAt: noon(form.expiresAt) } : {}),
          ...attachment,
        });
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const select = "flex h-10 w-full rounded-lg border bg-background px-3 text-sm";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit document" : "Add document"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          {!editing && (
            <>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={mode === "upload" ? "default" : "outline"} className="flex-1" onClick={() => setMode("upload")}>Upload a file</Button>
                <Button type="button" size="sm" variant={mode === "link" ? "default" : "outline"} className="flex-1" onClick={() => setMode("link")}>Save a link</Button>
              </div>
              {mode === "upload" ? (
                file ? (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{bytes(file.size)} · stored privately</p></div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Remove file" onClick={() => setFile(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <FileDrop accept={ACCEPT} maxBytes={MAX_BYTES} title="Drop a file or click to choose" hint="Images, PDF, Word, Excel or text. Up to 20 MB." onFile={chooseFile} onReject={setError} />
                )
              ) : (
                <div className="space-y-1"><Label>Link</Label><Input value={form.link} onChange={(event) => setForm((f) => ({ ...f, link: event.target.value }))} placeholder="https://..." /></div>
              )}
            </>
          )}
          <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))} maxLength={255} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <select className={select} value={form.category} onChange={(event) => setForm((f) => ({ ...f, category: event.target.value as DocCategory }))}>{CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
            </div>
            <div className="space-y-1">
              <Label>Folder</Label>
              <select className={select} value={form.folderId} onChange={(event) => setForm((f) => ({ ...f, folderId: event.target.value }))}>
                <option value="">No folder</option>
                {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Expires (optional)</Label><Input type="date" value={form.expiresAt} onChange={(event) => setForm((f) => ({ ...f, expiresAt: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Tags</Label><Input value={form.tags} onChange={(event) => setForm((f) => ({ ...f, tags: event.target.value }))} placeholder="insurance, 2026" /></div>
          </div>
          <div className="space-y-1"><Label>Summary (optional)</Label><Textarea rows={2} value={form.summary} maxLength={2000} onChange={(event) => setForm((f) => ({ ...f, summary: event.target.value }))} /></div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || !form.title.trim() || (!editing && mode === "upload" && !file && !!form.link)}>
              {upload.isPending ? "Uploading..." : busy ? "Saving..." : editing ? "Save changes" : "Add document"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FolderDialog({ editing, onClose }: { editing: DocFolder | null; onClose: () => void }) {
  const create = useCreateDocumentFolder();
  const update = useUpdateDocumentFolder();
  const remove = useDeleteDocumentFolder();
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (editing) await update.mutateAsync({ id: editing.id, data: { name: name.trim(), description: description.trim() } });
      else await create.mutateAsync({ name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}) });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeFolder() {
    if (!editing || !window.confirm(`Delete the folder "${editing.name}"?`)) return;
    setError(null);
    try {
      await remove.mutateAsync(editing.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{editing ? "Edit folder" : "New folder"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1"><Label>Name</Label><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required autoFocus /></div>
          <div className="space-y-1"><Label>Description (optional)</Label><Input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} /></div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            {editing ? <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={removeFolder}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button> : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || update.isPending || !name.trim()}>Save</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentsPage() {
  const { data, isLoading, isError, refetch } = useDocumentsDashboard();
  const update = useUpdateDocument();
  const remove = useDeleteDocument();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocCategory | "all">("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [status, setStatus] = useState<"active" | "archived" | "all">("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [docDialog, setDocDialog] = useState<{ id: number; editing: DocItem | null } | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ id: number; editing: DocFolder | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const documents = data?.documents;
  const folders = data?.folders;
  const folderName = useMemo(() => new Map((folders ?? []).map((folder) => [folder.id, folder.name])), [folders]);
  const folderCount = useMemo(() => {
    const map = new Map<string, number>();
    (documents ?? []).forEach((doc) => doc.folderId && map.set(doc.folderId, (map.get(doc.folderId) ?? 0) + 1));
    return map;
  }, [documents]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (documents ?? []).filter((doc) => {
      if (status === "active" && doc.status === "ARCHIVED") return false;
      if (status === "archived" && doc.status !== "ARCHIVED") return false;
      if (category !== "all" && doc.category !== category) return false;
      if (folderFilter === "none" && doc.folderId) return false;
      if (folderFilter !== "all" && folderFilter !== "none" && doc.folderId !== folderFilter) return false;
      return !needle || doc.title.toLowerCase().includes(needle) || (doc.fileName ?? "").toLowerCase().includes(needle) || (doc.summary ?? "").toLowerCase().includes(needle) || doc.tags.some((tag) => tag.toLowerCase().includes(needle));
    });
  }, [documents, query, category, folderFilter, status]);

  const selected = (documents ?? []).find((doc) => doc.id === selectedId) ?? null;
  const activeFolder = (folders ?? []).find((folder) => folder.id === folderFilter) ?? null;

  function select(id: string) {
    setSelectedId(id);
    setNotice(null);
    if (window.innerWidth < 1024) setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Couldn't load your documents.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { stats } = data;
  const info = selected ? expiry(selected.expiresAt) : null;
  const chip = (active: boolean) => cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Documents"
        subtitle="Your important files, kept private and organised."
        actions={<Button onClick={() => setDocDialog({ id: Date.now(), editing: null })}><Plus className="mr-1.5 h-4 w-4" /> Add document</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={FileText} label="Documents" value={stats.activeDocuments} hint={`${stats.totalDocuments} in total`} />
        <StatCard icon={AlertCircle} label="Needs attention" value={stats.expiringSoon + stats.expiredDocuments} tone={stats.expiringSoon + stats.expiredDocuments > 0 ? "warning" : "success"} hint={`${stats.expiringSoon} expiring · ${stats.expiredDocuments} expired`} />
        <StatCard icon={Archive} label="Archived" value={stats.archivedDocuments} />
        <StatCard icon={HardDrive} label="Storage used" value={bytes(stats.totalBytes)} hint="Files you uploaded" />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, file, tag or summary" className="h-9 pl-9" />
          </div>
          <div className="flex gap-1.5">
            {(["active", "archived", "all"] as const).map((key) => <button key={key} type="button" className={chip(status === key)} onClick={() => setStatus(key)}>{key === "active" ? "Active" : key === "archived" ? "Archived" : "All"}</button>)}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button type="button" className={chip(category === "all")} onClick={() => setCategory("all")}>All types</button>
          {CATEGORIES.map((item) => <button key={item.key} type="button" className={chip(category === item.key)} onClick={() => setCategory(item.key)}>{item.label}</button>)}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <button type="button" className={chip(folderFilter === "all")} onClick={() => setFolderFilter("all")}>All folders</button>
          <button type="button" className={chip(folderFilter === "none")} onClick={() => setFolderFilter("none")}>No folder</button>
          {data.folders.map((folder) => <button key={folder.id} type="button" className={chip(folderFilter === folder.id)} onClick={() => setFolderFilter(folder.id)}>{folder.name} <span className="opacity-60">{folderCount.get(folder.id) ?? 0}</span></button>)}
          {activeFolder && <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Edit folder" onClick={() => setFolderDialog({ id: Date.now(), editing: activeFolder })}><Pencil className="h-3.5 w-3.5" /></Button>}
          <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={() => setFolderDialog({ id: Date.now(), editing: null })}><FolderPlus className="mr-1 h-3.5 w-3.5" /> New folder</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={selected ? "lg:col-span-2" : "lg:col-span-3"}>
          {visible.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={data.documents.length === 0 ? "Your vault is empty" : "No documents match"}
              body={data.documents.length === 0 ? "Add IDs, certificates, policies and receipts. Files are stored privately." : "Try a different search or filter."}
              action={data.documents.length === 0 ? <Button size="sm" onClick={() => setDocDialog({ id: Date.now(), editing: null })}>Add your first document</Button> : undefined}
            />
          ) : (
            <div className={cn("grid gap-3 sm:grid-cols-2", !selected && "lg:grid-cols-3")}>
              {visible.map((doc) => {
                const due = expiry(doc.expiresAt);
                return (
                  <button key={doc.id} type="button" onClick={() => select(doc.id)} className={cn("space-y-2 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40", selectedId === doc.id && "border-primary ring-1 ring-primary/40", doc.status === "ARCHIVED" && "opacity-70")}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{doc.isPrivate ? <Lock className="h-4 w-4" /> : doc.fileUrl ? <Link2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{doc.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{LABEL[doc.category]}{doc.folderId ? ` · ${folderName.get(doc.folderId) ?? ""}` : ""}</span>
                      </span>
                    </div>
                    {due && <p className={cn("text-xs", toneClass[due.tone])}>{due.text}</p>}
                    {doc.tags.length > 0 && <div className="flex flex-wrap gap-1">{doc.tags.slice(0, 3).map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <div ref={panel} className="lg:col-span-1">
            <Section title={selected.title} icon={FileText} action={<Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Close details" onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></Button>}>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{LABEL[selected.category]}</Badge>
                {selected.status === "ARCHIVED" && <Badge variant="secondary">Archived</Badge>}
                {selected.folderId && <Badge variant="secondary"><Folder className="mr-1 h-3 w-3" /> {folderName.get(selected.folderId)}</Badge>}
              </div>
              {info && <p className={cn("text-sm", toneClass[info.tone])}>{info.text}</p>}
              {selected.summary && <p className="text-sm text-muted-foreground">{selected.summary}</p>}
              {selected.tags.length > 0 && <div className="flex flex-wrap gap-1">{selected.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div>}

              {selected.hasFile && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium">{selected.isPrivate ? <><Lock className="h-3 w-3 text-primary" /> Private file</> : <><Link2 className="h-3 w-3" /> Link</>}</p>
                  {selected.fileName && <p className="truncate text-xs text-muted-foreground">{selected.fileName}{selected.fileSize ? ` · ${bytes(selected.fileSize)}` : ""}</p>}
                  {selected.isPrivate ? (
                    <Button size="sm" onClick={() => openProtectedFile(`/documents/${selected.id}/file`).catch((err) => setNotice(err.message))}>Open file</Button>
                  ) : selected.fileUrl ? (
                    <Button size="sm" asChild><a href={selected.fileUrl} target="_blank" rel="noopener noreferrer">Open link</a></Button>
                  ) : null}
                </div>
              )}
              {notice && <p className="text-xs text-destructive">{notice}</p>}

              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button size="sm" variant="outline" onClick={() => setDocDialog({ id: Date.now(), editing: selected })}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: selected.id, data: { status: selected.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED" } })}>
                  {selected.status === "ARCHIVED" ? <><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore</> : <><Archive className="mr-1.5 h-3.5 w-3.5" /> Archive</>}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => window.confirm(`Delete "${selected.title}"? Its file is removed too.`) && remove.mutate(selected.id, { onSuccess: () => setSelectedId(null) })}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </Section>
          </div>
        )}
      </div>

      {docDialog && <DocDialog key={docDialog.id} editing={docDialog.editing} folders={data.folders} onClose={() => setDocDialog(null)} />}
      {folderDialog && <FolderDialog key={folderDialog.id} editing={folderDialog.editing} onClose={() => { setFolderDialog(null); setFolderFilter("all"); }} />}
    </div>
  );
}