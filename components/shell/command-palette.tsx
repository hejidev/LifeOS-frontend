"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Briefcase, CalendarDays, CheckSquare, CornerDownLeft, FileText, Flame, FolderOpen, HeartPulse, KeyRound, LayoutDashboard,
  Loader2, Plus, Search, Settings, Sparkles, Target, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useGlobalSearch, type SearchResult } from "@/lib/hooks/use-discover";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: LucideIcon;
}

const TYPE_META: Record<SearchResult["type"], { label: string; icon: LucideIcon }> = {
  task: { label: "Tasks", icon: CheckSquare },
  note: { label: "Notes", icon: FileText },
  document: { label: "Documents", icon: FolderOpen },
  goal: { label: "Goals", icon: Target },
  habit: { label: "Habits", icon: Flame },
  study: { label: "Study", icon: BookOpen },
  event: { label: "Calendar", icon: CalendarDays },
  vault: { label: "Password vault", icon: KeyRound },
  transaction: { label: "Transactions", icon: Wallet },
  career: { label: "Career", icon: Briefcase },
};

const ACTIONS: Omit<Item, "id" | "group">[] = [
  { title: "New task", href: "/app/tasks?new=true", icon: Plus },
  { title: "Ask the AI assistant", href: "/app/ai", icon: Sparkles },
  { title: "Add a transaction", href: "/app/finance", icon: Wallet },
  { title: "Log health", href: "/app/health", icon: HeartPulse },
  { title: "Add a document", href: "/app/documents", icon: FolderOpen },
];

const PAGES: Omit<Item, "id" | "group">[] = [
  { title: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { title: "Tasks", href: "/app/tasks", icon: CheckSquare },
  { title: "Notes", href: "/app/notes", icon: FileText },
  { title: "Calendar", href: "/app/calendar", icon: CalendarDays },
  { title: "Goals", href: "/app/goals", icon: Target },
  { title: "Habits", href: "/app/habits", icon: Flame },
  { title: "Health", href: "/app/health", icon: HeartPulse },
  { title: "Finance", href: "/app/finance", icon: Wallet },
  { title: "Budget and accounts", href: "/app/finance/budget", icon: Wallet },
  { title: "Study", href: "/app/study", icon: BookOpen },
  { title: "Career", href: "/app/career", icon: Briefcase },
  { title: "Documents", href: "/app/documents", icon: FolderOpen },
  { title: "Password vault", href: "/app/password-vault", icon: KeyRound },
  { title: "Family space", href: "/app/family", icon: Users },
  { title: "AI assistant", href: "/app/ai", icon: Sparkles },
  { title: "Settings", href: "/app/settings", icon: Settings },
];

export const OPEN_SEARCH_EVENT = "lifeos:open-search";

const typing = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return !!element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" || element.isContentEditable);
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const { results, isFetching, isError } = useGlobalSearch(query);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "/" && !typing(event.target) && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const needle = query.trim().toLowerCase();
    const wrap = (list: Omit<Item, "id" | "group">[], group: string): Item[] => list.map((entry) => ({ ...entry, id: `${group}:${entry.href}:${entry.title}`, group }));

    if (!needle) return [...wrap(ACTIONS, "Quick actions"), ...wrap(PAGES.slice(0, 8), "Go to")];

    const matchedActions = wrap(ACTIONS.filter((entry) => entry.title.toLowerCase().includes(needle)), "Quick actions");
    const matchedPages = wrap(PAGES.filter((entry) => entry.title.toLowerCase().includes(needle)), "Go to");
    const found: Item[] = results.map((result) => ({
      id: `${result.type}:${result.id}`,
      group: TYPE_META[result.type].label,
      title: result.title,
      subtitle: result.subtitle,
      href: result.href,
      icon: TYPE_META[result.type].icon,
    }));
    return [...found, ...matchedActions, ...matchedPages];
  }, [query, results]);

  useEffect(() => setActive(0), [query, results]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(items.length - 1, value + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(0, value - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(items[active]);
    }
  }

  let lastGroup = "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center gap-2 rounded-lg border bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump to...</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">Ctrl K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Search LifeOS</DialogTitle>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search tasks, notes, documents, goals and more"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search"
            />
            {isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          </div>

          <div ref={listRef} className="max-h-[22rem] overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {isError ? "Search isn't available right now." : isFetching ? "Searching..." : query.trim().length < 2 ? "Keep typing..." : `Nothing found for "${query.trim()}".`}
              </p>
            ) : (
              items.map((item, index) => {
                const heading = item.group !== lastGroup;
                lastGroup = item.group;
                const Icon = item.icon;
                return (
                  <div key={item.id}>
                    {heading && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:pt-1">{item.group}</p>}
                    <button
                      type="button"
                      data-index={index}
                      onMouseMove={() => setActive(index)}
                      onClick={() => go(item)}
                      className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", index === active ? "bg-primary/10" : "hover:bg-muted/60")}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{item.title}</span>
                        {item.subtitle && <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>}
                      </span>
                      {index === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
            <span>Arrow keys to move, Enter to open</span>
            <span>Esc to close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}