"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Pin,
  ListTodo,
  Sparkles,
  Paperclip,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
  useNotes,
  useUpdateNote,
  useCreateNote,
  useConvertNoteToTask,
} from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/life";

// Motion variants reused from Dashboard / Tasks
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function NotesContent() {
  const { data: notes, isLoading } = useNotes();
  const updateNote = useUpdateNote();
  const createNote = useCreateNote();
  const convertToTask = useConvertNoteToTask();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<string>("all");
  const [preview, setPreview] = useState(true);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  // Create‑draft state for quick capture from the header or sidebar
  const [draft, setDraft] = useState<Partial<Note>>({
    title: "",
    content: "",
  });

  // Selected note
  const selected = notes?.find((n) => n.id === selectedId) || notes?.[0];

  // Handle URL ?id=... selection
  useEffect(() => {
    const urlId = searchParams.get("id");
    if (urlId) setSelectedId(urlId);
    else if (notes?.length && !selectedId) setSelectedId(notes[0].id);
  }, [searchParams, notes, selectedId]);

  // Sync editor state when selected changes
  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title);
      setEditContent(selected.content);
    }
  }, [selected]);

  // Filter notes by folder + search
  const filtered = notes?.filter((n) => {
    const matchFolder = folder === "all" || n.folder === folder;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      n.title.toLowerCase().includes(q) ||
      n.summary?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q);
    return matchFolder && matchSearch;
  });

  const handleSave = () => {
    if (!selected) return;
    updateNote.mutate({
      id: selected.id,
      data: { title: editTitle, content: editContent },
    });
  };

  const handleNewNote = () => {
    const folderName = folder === "all" ? "Personal" : folder;
    createNote.mutate(
      { title: "Untitled", content: "", folder: folderName },
      { onSuccess: (note) => setSelectedId(note.id) }
    );
  };

  const handleCreateFromDraft = () => {
    if (!draft.title?.trim()) return;
    createNote.mutate(
      {
        title: draft.title!,
        content: draft.content || "",
        folder: folder === "all" ? "Personal" : folder,
      },
      {
        onSuccess: (note) => {
          setDraft({ title: "", content: "" });
          setSelectedId(note.id);
        },
      }
    );
  };

  if (isLoading || !notes) {
    // Premium skeleton, full height
    return (
      <Skeleton className="h-[calc(100vh-8rem)] rounded-xl" />
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Premium header (from first NotesPage) */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Notes
          </h1>
          <p className="text-muted-foreground mt-1">
            Capture ideas, plans, and knowledge · Turn them into action
          </p>
        </div>
        <Button onClick={handleNewNote}>
          <Plus className="mr-2 h-4 w-4" /> New note
        </Button>
      </motion.div>

      {/* Full notes app shell (from NotesContent), wrapped in motion */}
      <motion.div variants={item}>
        <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border overflow-hidden">
          {/* Sidebar: folders + search + quick capture */}
          <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
            <div className="p-3 border-b border-border space-y-2">
              <Button size="sm" className="w-full" onClick={handleNewNote}>
                <Plus className="h-4 w-4 mr-2" /> New Note
              </Button>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  className="pl-8 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {/* Folders */}
              <div className="p-2 space-y-1">
                <button
                  className={cn(
                    "w-full text-left px-2 py-1 text-xs font-medium uppercase tracking-wider rounded",
                    folder === "all"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setFolder("all")}
                >
                  All Notes
                </button>
                {/* {noteFolders.map((f) => (
                  <button
                    key={f}
                    className={cn(
                      "w-full text-left px-2 py-1 text-xs font-medium uppercase tracking-wider rounded",
                      folder === f
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setFolder(f)}
                  >
                    {f}
                  </button> */}
                {/* ))} */}
              </div>

              <Separator className="my-2" />

              {/* Note list */}
              {filtered?.map((note) => (
                <button
                  key={note.id}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors",
                    selectedId === note.id && "bg-accent"
                  )}
                  onClick={() => setSelectedId(note.id)}
                >
                  <div className="flex items-center gap-1">
                    {note.pinned && (
                      <Pin className="h-3 w-3 text-primary shrink-0" />
                    )}
                    <span className="truncate font-medium">{note.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {note.folder}
                  </p>
                </button>
              ))}
            </ScrollArea>

            {/* Quick capture (from first NotesPage idea) */}
            <div className="border-t border-border p-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Quick Capture
              </p>
              <Input
                placeholder="Idea or note title..."
                value={draft.title ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                className="text-sm"
              />
              <Textarea
                placeholder="Details (optional)..."
                value={draft.content ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, content: e.target.value }))
                }
                rows={3}
                className="text-xs"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handleCreateFromDraft}>
                  Save note
                </Button>
              </div>
            </div>
          </div>

          {/* Main editor + side panel */}
          {selected ? (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Editor header */}
              <div className="flex items-center gap-2 p-3 border-b border-border">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="border-0 text-lg font-semibold focus-visible:ring-0 px-0"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreview(!preview)}
                  >
                    {preview ? "Edit" : "Preview"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => convertToTask.mutate(selected.id)}
                    title="Convert to task"
                  >
                    <ListTodo className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Editor + preview + right panel */}
              <div className="flex flex-1 min-h-0">
                {/* Editor / preview */}
                <div
                  className={cn(
                    "flex-1 p-4",
                    preview && "border-r border-border"
                  )}
                >
                  {!preview ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="h-full min-h-[400px] border-0 resize-none focus-visible:ring-0 font-mono text-sm"
                      placeholder="Start writing in markdown..."
                    />
                  ) : (
                    <ScrollArea className="h-full">
                      <article className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-blockquote:border-primary">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {editContent || "_No content yet. Switch to Edit to start writing._"}
                        </ReactMarkdown>
                      </article>
                    </ScrollArea>
                  )}
                </div>

                {/* Right panel: AI summary, tags, attachments, linked tasks */}
                <div className="w-80 shrink-0 p-4 space-y-4 overflow-y-auto hidden lg:block">
                  {/* AI summary */}
                  {selected.summary && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          AI Summary
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {selected.summary}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {selected.tags?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Tags
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selected.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {selected.attachments?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Attachments
                      </p>
                      {selected.attachments.map((a) => (
                        <div
                          key={a.name}
                          className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50 mb-1"
                        >
                          <Paperclip className="h-3 w-3" />
                          {a.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Linked tasks */}
                  {selected.linkedTaskIds?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Linked Tasks
                      </p>
                      {selected.linkedTaskIds.map((id) => (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="text-xs mr-1"
                        >
                          {id}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground mt-4">
                    Updated{" "}
                    {selected.updatedAt
                      ? new Date(selected.updatedAt).toLocaleDateString()
                      : "recently"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Empty state when no selected note
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-2">No notes yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start writing to capture your thoughts.
              </p>
              <Button onClick={handleNewNote}>
                <Plus className="h-4 w-4 mr-2" /> Create your first note
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}