"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, FileText, ListTodo, Pin, PinOff, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader } from "@/components/app/kit";
import { useConvertNoteToTask, useCreateNote, useDeleteNote, useNotes, useTasks, useUpdateNote } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/life";

const FOLDERS = ["Personal", "Work", "Study"] as const;

interface Draft {
  title: string;
  content: string;
  folder: string;
  tags: string[];
}

type SaveState = "saved" | "saving" | "dirty" | "error";

const snippet = (text: string) => text.replace(/[#*_>`\-[\]()]/g, "").replace(/\s+/g, " ").trim().slice(0, 90);

export default function NotesContent() {
  const searchParams = useSearchParams();
  const { data: notes, isLoading } = useNotes();
  const { data: tasks } = useTasks();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const convertToTask = useConvertNoteToTask();

  const [folder, setFolder] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<SaveState>("saved");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [showEditor, setShowEditor] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ id: string; draft: Draft } | null>(null);

  function save(id: string, next: Draft) {
    setStatus("saving");
    updateNote.mutate(
      { id, data: { title: next.title.trim() || "Untitled", content: next.content, folder: next.folder, tags: next.tags } },
      { onSuccess: () => setStatus((current) => (current === "saving" ? "saved" : current)), onError: () => setStatus("error") }
    );
  }

  function flushPending() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const job = pending.current;
    pending.current = null;
    if (job) save(job.id, job.draft);
  }

  useEffect(() => () => flushPending(), []);

  function openNote(note: Note, reveal = true) {
    flushPending();
    setSelectedId(note.id);
    setDraft({ title: note.title, content: note.content, folder: note.folder, tags: note.tags });
    setStatus("saved");
    setNotice(null);
    setTagInput("");
    if (reveal) setShowEditor(true);
  }

  useEffect(() => {
    if (!notes || selectedId) return;
    const requested = searchParams.get("id") ?? searchParams.get("highlight");
    const target = notes.find((note) => note.id === requested) ?? notes[0];
    if (target) openNote(target, !!requested);
  }, [notes]);

  const selected = (notes ?? []).find((note) => note.id === selectedId) ?? null;

  function edit(patch: Partial<Draft>) {
    if (!selected || !draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    setStatus("dirty");
    pending.current = { id: selected.id, draft: next };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flushPending, 900);
  }

  function create() {
    createNote.mutate(
      { title: "Untitled", content: "", folder: folder === "all" ? "Personal" : folder },
      {
        onSuccess: (note) => {
          openNote(note);
          setMode("write");
        },
      }
    );
  }

  function remove() {
    if (!selected || !window.confirm(`Delete "${selected.title}"? This can't be undone.`)) return;
    if (timer.current) clearTimeout(timer.current);
    pending.current = null;
    deleteNote.mutate(selected.id, {
      onSuccess: () => {
        setSelectedId(null);
        setDraft(null);
        setShowEditor(false);
      },
    });
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().slice(0, 30);
    if (!tag || !draft || draft.tags.includes(tag) || draft.tags.length >= 20) return;
    edit({ tags: [...draft.tags, tag] });
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: notes?.length ?? 0 };
    (notes ?? []).forEach((note) => {
      result[note.folder] = (result[note.folder] ?? 0) + 1;
    });
    return result;
  }, [notes]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (notes ?? []).filter(
      (note) =>
        (folder === "all" || note.folder === folder) &&
        (!needle || note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle) || note.tags.some((tag) => tag.toLowerCase().includes(needle)))
    );
  }, [notes, folder, search]);

  const linkedTasks = selected ? (tasks ?? []).filter((task) => selected.linkedTaskIds.includes(task.id)) : [];
  const words = draft?.content.trim() ? draft.content.trim().split(/\s+/).length : 0;

  if (isLoading || !notes) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-[28rem] rounded-xl" />
      </div>
    );
  }

  const statusText = { saved: "Saved", saving: "Saving...", dirty: "Unsaved changes", error: "Couldn't save" }[status];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Notes"
        subtitle={`${notes.length} ${notes.length === 1 ? "note" : "notes"} · writes in Markdown, saves as you type`}
        actions={<Button onClick={create} disabled={createNote.isPending}><Plus className="mr-1.5 h-4 w-4" /> New note</Button>}
      />

      {notes.length === 0 ? (
        <EmptyState icon={FileText} title="Start your first note" body="Capture ideas, plans and knowledge, then turn them into tasks." action={<Button onClick={create}>Create a note</Button>} />
      ) : (
        <div className="grid h-[calc(100vh-14rem)] min-h-[30rem] overflow-hidden rounded-xl border md:grid-cols-[300px_1fr]">
          <aside className={cn("min-h-0 flex-col border-b bg-muted/10 md:flex md:border-b-0 md:border-r", showEditor ? "hidden" : "flex")}>
            <div className="space-y-2 border-b p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" className="h-9 pl-9" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["all", ...FOLDERS].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFolder(key)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", folder === key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                  >
                    {key === "all" ? "All" : key} <span className="opacity-60">{counts[key] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {visible.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No notes match.</p>
              ) : (
                visible.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => openNote(note)}
                    className={cn("block w-full border-b px-3 py-3 text-left transition-colors hover:bg-muted/50", selectedId === note.id && "bg-muted")}
                  >
                    <span className="flex items-center gap-1.5">
                      {note.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                      <span className="truncate text-sm font-medium">{note.title}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{snippet(note.content) || "Empty note"}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground/80">{note.folder} · {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className={cn("min-h-0 flex-col md:flex", showEditor ? "flex" : "hidden")}>
            {selected && draft ? (
              <>
                <div className="flex items-center gap-2 border-b p-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => { flushPending(); setShowEditor(false); }}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Input
                    value={draft.title}
                    onChange={(event) => edit({ title: event.target.value })}
                    placeholder="Title"
                    className="h-9 border-0 bg-transparent px-1 text-lg font-semibold shadow-none focus-visible:ring-0"
                    maxLength={200}
                  />
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon" variant="ghost" title={selected.pinned ? "Unpin" : "Pin"} onClick={() => updateNote.mutate({ id: selected.id, data: { pinned: !selected.pinned } })}>
                      {selected.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Turn into a task"
                      disabled={convertToTask.isPending}
                      onClick={() => {
                        flushPending();
                        convertToTask.mutate(selected.id, { onSuccess: () => setNotice("Task created from this note"), onError: () => setNotice("Couldn't create the task") });
                      }}
                    >
                      <ListTodo className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Delete" className="text-destructive hover:text-destructive" onClick={remove}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                  <select value={draft.folder} onChange={(event) => edit({ folder: event.target.value })} className="h-8 rounded-lg border bg-background px-2 text-xs">
                    {FOLDERS.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <div className="flex rounded-lg border p-0.5 text-xs">
                    {(["write", "preview"] as const).map((key) => (
                      <button key={key} type="button" onClick={() => setMode(key)} className={cn("rounded-md px-3 py-1 font-medium capitalize", mode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                        {key}
                      </button>
                    ))}
                  </div>
                  <div className="flex min-w-[8rem] flex-1 flex-wrap items-center gap-1.5">
                    {draft.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                        {tag}
                        <button type="button" aria-label={`Remove ${tag}`} onClick={() => edit({ tags: draft.tags.filter((item) => item !== tag) })}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    <input
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          addTag(tagInput);
                          setTagInput("");
                        }
                      }}
                      placeholder="Add tag"
                      className="h-7 w-20 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {mode === "write" ? (
                    <Textarea
                      value={draft.content}
                      onChange={(event) => edit({ content: event.target.value })}
                      placeholder="Start writing. Markdown works: # headings, - lists, **bold**, [ ] checkboxes."
                      className="h-full min-h-[18rem] resize-none border-0 p-0 font-mono text-sm shadow-none focus-visible:ring-0"
                    />
                  ) : (
                    <article className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.content || "_Nothing written yet._"}</ReactMarkdown>
                    </article>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-3">
                    <span className={cn(status === "error" && "text-destructive")}>{statusText}</span>
                    {status === "error" && <button className="underline" onClick={() => save(selected.id, draft)}>Retry</button>}
                    <span>{words} {words === 1 ? "word" : "words"}</span>
                    {notice && <span className="text-foreground">{notice}</span>}
                  </span>
                  {linkedTasks.length > 0 && (
                    <span className="flex flex-wrap items-center gap-2">
                      Tasks:
                      {linkedTasks.slice(0, 3).map((task) => (
                        <Link key={task.id} href={`/app/tasks?id=${task.id}`} className="max-w-[10rem] truncate rounded-full border px-2 py-0.5 hover:border-primary/40">{task.title}</Link>
                      ))}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <EmptyState icon={FileText} title="Pick a note" body="Choose a note from the list, or start a new one." />
            )}
          </section>
        </div>
      )}
    </div>
  );
}