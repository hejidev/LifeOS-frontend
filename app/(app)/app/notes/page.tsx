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
