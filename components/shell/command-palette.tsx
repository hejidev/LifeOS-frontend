"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, ListChecks, FileText, Wallet, BookOpen, Search,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useTasks, useNotes, useFinanceSummary, useStudyMaterials } from "@/lib/hooks/use-life-data";

const PAGES = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "Tasks", href: "/app/tasks", icon: ListChecks },
  { label: "Notes", href: "/app/notes", icon: FileText },
  { label: "Finance", href: "/app/finance", icon: Wallet },
  { label: "Study", href: "/app/study", icon: BookOpen },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: tasks = [] } = useTasks();
  const { data: notes = [] } = useNotes();
  const { data: financeData } = useFinanceSummary();
  const { data: materials = [] } = useStudyMaterials();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const transactions = financeData?.transactions ?? [];

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full max-w-sm justify-between text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2"><Search className="h-4 w-4" /> Search...</div>
        <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, tasks, notes, transactions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Pages">
            {PAGES.map((p) => (
              <CommandItem key={p.href} onSelect={() => go(p.href)} className="text-sm">
                <p.icon className="mr-2 h-4 w-4" /> {p.label}
              </CommandItem>
            ))}
          </CommandGroup>

          {tasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {tasks.slice(0, 6).map((t: any) => (
                <CommandItem key={t.id} onSelect={() => go(`/app/tasks?highlight=${t.id}`)} className="text-sm">
                  <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-muted-foreground">{t.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {notes.length > 0 && (
            <CommandGroup heading="Notes">
              {notes.slice(0, 6).map((n: any) => (
                <CommandItem key={n.id} onSelect={() => go(`/app/notes?highlight=${n.id}`)} className="text-sm">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  {n.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {transactions.length > 0 && (
            <CommandGroup heading="Transactions">
              {transactions.slice(0, 6).map((tx: any) => (
                <CommandItem key={tx.id} onSelect={() => go("/app/finance")} className="text-sm">
                  <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{tx.description}</span>
                  <span className="text-xs text-muted-foreground">{tx.amount}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {materials.length > 0 && (
            <CommandGroup heading="Study Materials">
              {materials.slice(0, 6).map((m: any) => (
                <CommandItem key={m.id} onSelect={() => go("/app/study")} className="text-sm">
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  {m.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}