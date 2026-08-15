// import { NotesContent } from "@/components/notes/notes-content";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { NotesPageShell } from "@/components/notes/notes-page-shell";

export default function NotesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <NotesPageShell />
    </Suspense>
  );
}

// "use client";

// import { useState } from "react";
// import { motion } from "framer-motion";
// import { format } from "date-fns";
// import {
//   FileText,
//   Plus,
//   ArrowRight,
//   Sparkles,
// } from "lucide-react";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   useNotes,
//   useCreateNote,
//   useUpdateNote,
//   useConvertNoteToTask,
// } from "@/lib/hooks/use-life-data";
// import type { Note } from "@/types/life";

// const container = {
//   hidden: { opacity: 0 },
//   show: { opacity: 1, transition: { staggerChildren: 0.06 } },
// };

// const item = {
//   hidden: { opacity: 0, y: 12 },
//   show: { opacity: 1, y: 0 },
// };

// export default function NotesPage() {
//   const { data: notes, isLoading } = useNotes();
//   const createNote = useCreateNote();
//   const updateNote = useUpdateNote();
//   const convertNoteToTask = useConvertNoteToTask();

//   const [selectedId, setSelectedId] = useState<string | null>(null);
//   const [search, setSearch] = useState("");
//   const [draft, setDraft] = useState<Partial<Note>>({
//     title: "",
//     content: "",
//   });

//   if (isLoading || !notes) {
//     return (
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {Array.from({ length: 4 }).map((_, i) => (
//           <Card key={i} className="h-32">
//             <CardContent className="p-4">
//               <div className="h-4 w-2/3 bg-muted rounded mb-2" />
//               <div className="h-3 w-1/2 bg-muted rounded" />
//             </CardContent>
//           </Card>
//         ))}
//       </div>
//     );
//   }

//   const filteredNotes = notes.filter((note) => {
//     if (!search) return true;
//     const q = search.toLowerCase();
//     return (
//       note.title.toLowerCase().includes(q) ||
//       note.summary?.toLowerCase().includes(q) ||
//       note.content?.toLowerCase().includes(q)
//     );
//   });

//   const selected =
//     notes.find((n) => n.id === selectedId) ?? filteredNotes[0] ?? null;

//   const handleSaveExisting = () => {
//     if (!selected) return;
//     updateNote.mutate({
//       id: selected.id,
//       data: {
//         title: selected.title,
//         content: selected.content,
//       },
//     });
//   };

//   const handleCreate = () => {
//     if (!draft.title?.trim()) return;
//     createNote.mutate(
//       {
//         title: draft.title!,
//         content: draft.content || "",
//         folder: "",
//       },
//       {
//         onSuccess: () => {
//           setDraft({ title: "", content: "" });
//         },
//       }
//     );
//   };

//   const handleConvertToTask = () => {
//     if (!selected) return;
//     convertNoteToTask.mutate(selected.id);
//   };

//   return (
//     <motion.div
//       variants={container}
//       initial="hidden"
//       animate="show"
//       className="space-y-6"
//     >
//       {/* Header */}
//       <motion.div variants={item} className="flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
//             <FileText className="h-6 w-6 text-primary" />
//             Notes
//           </h1>
//           <p className="text-muted-foreground mt-1">
//             Capture ideas, plans, and knowledge · Turn them into action
//           </p>
//         </div>
//         <Button onClick={handleCreate}>
//           <Plus className="mr-2 h-4 w-4" /> New note
//         </Button>
//       </motion.div>

//       {/* Main split layout */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         {/* Notes list */}
//         <motion.div variants={item} className="lg:col-span-1 space-y-3">
//           <Card className="hover:border-primary/20 transition-colors">
//             <CardHeader className="pb-3">
//               <CardTitle className="text-base">All Notes</CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-3">
//               <Input
//                 placeholder="Search notes..."
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 className="text-sm"
//               />
//               <div className="space-y-1 max-h-[320px] overflow-y-auto pt-1">
//                 {filteredNotes.length === 0 ? (
//                   <p className="text-sm text-muted-foreground">
//                     No notes yet. Create one to get started.
//                   </p>
//                 ) : (
//                   filteredNotes.map((note) => (
//                     <button
//                       key={note.id}
//                       type="button"
//                       onClick={() => setSelectedId(note.id)}
//                       className={`w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-accent/50 transition-colors ${
//                         selected?.id === note.id
//                           ? "bg-accent text-foreground"
//                           : "text-muted-foreground"
//                       }`}
//                     >
//                       <p className="font-medium truncate">{note.title}</p>
//                       {note.summary && (
//                         <p className="text-xs mt-0.5 truncate">
//                           {note.summary}
//                         </p>
//                       )}
//                     </button>
//                   ))
//                 )}
//               </div>
//             </CardContent>
//           </Card>

//           {/* Quick capture card */}
//           <Card className="hover:border-primary/20 transition-colors">
//             <CardHeader className="pb-3">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <Sparkles className="h-4 w-4 text-primary" /> Quick Capture
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-2 text-sm">
//               <Input
//                 placeholder="Idea or note title..."
//                 value={draft.title ?? ""}
//                 onChange={(e) =>
//                   setDraft((d) => ({ ...d, title: e.target.value }))
//                 }
//               />
//               <Textarea
//                 placeholder="Details (optional)..."
//                 value={draft.content ?? ""}
//                 onChange={(e) =>
//                   setDraft((d) => ({ ...d, content: e.target.value }))
//                 }
//                 rows={3}
//               />
//               <div className="flex justify-end">
//                 <Button size="sm" onClick={handleCreate}>
//                   Save note
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         </motion.div>

//         {/* Editor / detail */}
//         <motion.div
//           variants={item}
//           className="lg:col-span-2 space-y-4"
//         >
//           <Card className="hover:border-primary/20 transition-colors">
//             <CardHeader className="pb-3 flex items-center justify-between">
//               <CardTitle className="text-base">
//                 {selected ? "Note Detail" : "No note selected"}
//               </CardTitle>
//               {selected && (
//                 <Badge variant="outline" className="text-xs">
//                   Last updated{" "}
//                   {selected.updatedAt
//                     ? format(new Date(selected.updatedAt), "MMM d, yyyy")
//                     : "recently"}
//                 </Badge>
//               )}
//             </CardHeader>
//             <CardContent className="space-y-3">
//               {selected ? (
//                 <>
//                   <Input
//                     className="text-lg font-semibold"
//                     value={selected.title}
//                     onChange={(e) => {
//                       selected.title = e.target.value;
//                       // optimistic client update; server save on button
//                     }}
//                   />
//                   <Textarea
//                     className="min-h-[220px] text-sm font-mono"
//                     value={selected.content ?? ""}
//                     onChange={(e) => {
//                       selected.content = e.target.value;
//                     }}
//                   />
//                   <div className="flex justify-between items-center pt-2">
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={handleSaveExisting}
//                     >
//                       Save changes
//                     </Button>
//                     <Button
//                       size="sm"
//                       variant="default"
//                       onClick={handleConvertToTask}
//                     >
//                       Convert to task <ArrowRight className="ml-1 h-3 w-3" />
//                     </Button>
//                   </div>
//                 </>
//               ) : (
//                 <p className="text-sm text-muted-foreground">
//                   Select a note from the list or create a new one to start editing.
//                 </p>
//               )}
//             </CardContent>
//           </Card>

//           {/* AI summary placeholder */}
//           {selected && (
//             <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
//               <CardHeader className="pb-3">
//                 <CardTitle className="text-base flex items-center gap-2">
//                   <Sparkles className="h-4 w-4 text-primary" /> AI Summary & Actions
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-2 text-sm">
//                 <p className="text-muted-foreground">
//                   In a future phase, this card will show AI‑generated summaries,
//                   key points, and suggested tasks based on this note.
//                 </p>
//                 <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
//                   <li>Generate a concise summary for daily review.</li>
//                   <li>Extract action items and turn them into tasks.</li>
//                   <li>Suggest related notes or learning resources.</li>
//                 </ul>
//               </CardContent>
//             </Card>
//           )}
//         </motion.div>
//       </div>
//     </motion.div>
//   );
// }