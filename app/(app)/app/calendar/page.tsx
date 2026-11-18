"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, addMonths, format, isSameMonth, isToday } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ListChecks, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, Section } from "@/components/app/kit";
import { useCalendarWindow, type CalendarEvent } from "@/lib/hooks/use-calendar";
import { useCreateCalendarEvent, useDeleteCalendarEvent, useTasks, useUpdateCalendarEvent, useUserProfile } from "@/lib/hooks/use-life-data";
import { cn } from "@/lib/utils";

const TYPES = [
  { key: "MEETING", label: "Meeting", dot: "bg-sky-500", pill: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  { key: "PERSONAL", label: "Personal", dot: "bg-emerald-500", pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { key: "DEADLINE", label: "Deadline", dot: "bg-red-500", pill: "bg-red-500/15 text-red-700 dark:text-red-300" },
  { key: "REMINDER", label: "Reminder", dot: "bg-amber-500", pill: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { key: "OTHER", label: "Other", dot: "bg-slate-400", pill: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
];

const TYPE_BY_KEY: Record<string, (typeof TYPES)[number]> = Object.fromEntries(TYPES.map((type) => [type.key, type]));
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (value: number) => String(value).padStart(2, "0");
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dateOf = (key: string) => new Date(`${key}T00:00:00`);

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

interface Form {
  title: string;
  type: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  description: string;
}

const blankForm = (dateKey: string): Form => ({
  title: "",
  type: "MEETING",
  allDay: false,
  startDate: dateKey,
  startTime: "09:00",
  endDate: dateKey,
  endTime: "10:00",
  location: "",
  description: "",
});

function formFromEvent(event: CalendarEvent): Form {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return {
    title: event.title,
    type: event.type,
    allDay: event.allDay,
    startDate: keyOf(start),
    startTime: format(start, "HH:mm"),
    endDate: keyOf(end),
    endTime: format(end, "HH:mm"),
    location: event.location ?? "",
    description: event.description ?? "",
  };
}

function eventDays(event: CalendarEvent) {
  const first = new Date(event.start);
  const last = new Date(event.end);
  const keys: string[] = [];
  let day = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const stop = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  for (let guard = 0; day <= stop && guard < 45; guard += 1) {
    keys.push(keyOf(day));
    day = addDays(day, 1);
  }
  return keys;
}

const timeLabel = (event: CalendarEvent) => (event.allDay ? "All day" : format(new Date(event.start), "h:mm a"));

export default function CalendarPage() {
  const { data: profile } = useUserProfile();
  const prefs = profile as { weekStartsOn?: number; preferences?: { weekStartsOn?: number } } | undefined;
  const weekStart = (prefs?.weekStartsOn ?? prefs?.preferences?.weekStartsOn) === 0 ? 0 : 1;

  const [cursor, setCursor] = useState(() => monthStart(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => keyOf(new Date()));
  const [view, setView] = useState<"month" | "agenda">("month");
  const [dialog, setDialog] = useState<{ event?: CalendarEvent } | null>(null);
  const [form, setForm] = useState<Form>(() => blankForm(keyOf(new Date())));
  const [error, setError] = useState<string | null>(null);

  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();
  const { data: tasks } = useTasks();

  const gridStart = useMemo(() => addDays(cursor, -((cursor.getDay() - weekStart + 7) % 7)), [cursor, weekStart]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => addDays(gridStart, index)), [gridStart]);
  const { data: events = [], isLoading } = useCalendarWindow(gridStart.toISOString(), addDays(gridStart, 42).toISOString());

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      eventDays(event).forEach((key) => map.set(key, [...(map.get(key) ?? []), event]));
    });
    map.forEach((list) => list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start)));
    return map;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, { id: string; title: string }[]>();
    (tasks ?? [])
      .filter((task) => task.status !== "done" && task.dueDate)
      .forEach((task) => {
        const key = task.dueDate!.slice(0, 10);
        map.set(key, [...(map.get(key) ?? []), { id: task.id, title: task.title }]);
      });
    return map;
  }, [tasks]);

  const monthEvents = events.filter((event) => eventDays(event).some((key) => key.startsWith(format(cursor, "yyyy-MM"))));
  const orderedWeekdays = Array.from({ length: 7 }, (_, index) => WEEKDAYS[(weekStart + index) % 7]);
  const pending = createEvent.isPending || updateEvent.isPending;

  function openCreate(key: string) {
    setForm(blankForm(key));
    setError(null);
    setDialog({});
  }

  function openEdit(event: CalendarEvent) {
    setForm(formFromEvent(event));
    setError(null);
    setDialog({ event });
  }

  function setField<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const start = new Date(form.allDay ? `${form.startDate}T00:00:00` : `${form.startDate}T${form.startTime}`);
    const end = new Date(form.allDay ? `${form.endDate}T23:59:00` : `${form.endDate}T${form.endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setError("Check the dates and times.");
    if (end < start) return setError("The event can't end before it starts.");

    const payload = {
      title: form.title.trim(),
      type: form.type,
      allDay: form.allDay,
      location: form.location.trim(),
      description: form.description.trim(),
      start: start.toISOString(),
      end: end.toISOString(),
    };
    const outcome = { onSuccess: () => setDialog(null), onError: (err: Error) => setError(err.message) };
    if (dialog?.event) updateEvent.mutate({ id: dialog.event.id, data: payload }, outcome);
    else createEvent.mutate(payload, outcome);
  }

  function remove() {
    if (!dialog?.event || !window.confirm(`Delete "${dialog.event.title}"?`)) return;
    deleteEvent.mutate(dialog.event.id, { onSuccess: () => setDialog(null), onError: (err: Error) => setError(err.message) });
  }

  function jump(key: string) {
    setCursor(monthStart(dateOf(key)));
    setSelectedKey(key);
  }

  const selectedEvents = eventsByDay.get(selectedKey) ?? [];
  const selectedTasks = tasksByDay.get(selectedKey) ?? [];

  const EventRow = ({ event }: { event: CalendarEvent }) => (
    <button type="button" onClick={() => openEdit(event)} className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/40">
      <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", TYPE_BY_KEY[event.type]?.dot)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{event.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeLabel(event)}</span>
          {event.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>}
        </span>
      </span>
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarDays}
        title="Calendar"
        subtitle={`${monthEvents.length} ${monthEvents.length === 1 ? "event" : "events"} in ${format(cursor, "MMMM")}`}
        actions={<Button onClick={() => openCreate(selectedKey)}><Plus className="mr-1.5 h-4 w-4" /> New event</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCursor((current) => addMonths(current, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCursor((current) => addMonths(current, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-9" onClick={() => jump(keyOf(new Date()))}>Today</Button>
        </div>
        <h2 className="text-lg font-semibold">{format(cursor, "MMMM yyyy")}</h2>
        <Tabs value={view} onValueChange={(value) => setView(value as "month" | "agenda")} className="ml-auto">
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isLoading ? (
            <Skeleton className="h-[34rem] rounded-xl" />
          ) : view === "month" ? (
            <div className="overflow-hidden rounded-xl border">
              <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
                {orderedWeekdays.map((label) => <div key={label} className="py-2">{label}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const key = keyOf(day);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const dayTasks = tasksByDay.get(key) ?? [];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedKey(key)}
                      onDoubleClick={() => openCreate(key)}
                      className={cn(
                        "flex min-h-[5.5rem] flex-col gap-1 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40 sm:min-h-[6.5rem]",
                        !isSameMonth(day, cursor) && "bg-muted/20 text-muted-foreground",
                        selectedKey === key && "bg-primary/5 ring-1 ring-inset ring-primary"
                      )}
                    >
                      <span className={cn("flex h-6 w-6 items-center justify-center self-end rounded-full text-xs", isToday(day) && "bg-primary font-semibold text-primary-foreground")}>
                        {day.getDate()}
                      </span>
                      <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                        {dayEvents.slice(0, 2).map((event) => (
                          <span key={event.id} className={cn("truncate rounded px-1.5 py-0.5 text-[11px] font-medium", TYPE_BY_KEY[event.type]?.pill)}>{event.title}</span>
                        ))}
                        {dayEvents.length > 2 && <span className="px-1 text-[11px] text-muted-foreground">+{dayEvents.length - 2} more</span>}
                        {dayTasks.length > 0 && (
                          <span className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground"><ListChecks className="h-3 w-3" /> {dayTasks.length} due</span>
                        )}
                      </span>
                      <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span key={event.id} className={cn("h-1.5 w-1.5 rounded-full", TYPE_BY_KEY[event.type]?.dot)} />
                        ))}
                        {dayTasks.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            (() => {
              const prefix = format(cursor, "yyyy-MM");
              const agendaDays = [...eventsByDay.keys()].filter((key) => key.startsWith(prefix)).sort();
              if (agendaDays.length === 0) {
                return <EmptyState icon={CalendarDays} title={`Nothing in ${format(cursor, "MMMM")}`} body="Add an event and it will show up here." />;
              }
              return (
                <div className="space-y-5">
                  {agendaDays.map((key) => (
                    <div key={key} className="space-y-2">
                      <p className={cn("text-xs font-semibold uppercase tracking-wide", key === keyOf(new Date()) ? "text-primary" : "text-muted-foreground")}>
                        {format(dateOf(key), "EEEE, d MMMM")}
                      </p>
                      {(eventsByDay.get(key) ?? []).map((event) => <EventRow key={event.id} event={event} />)}
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        <div className="space-y-4">
          <Section
            title={format(dateOf(selectedKey), "EEEE, d MMMM")}
            icon={CalendarDays}
            action={<Button size="sm" variant="outline" onClick={() => openCreate(selectedKey)}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>}
          >
            {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nothing planned" body="Add an event for this day." />
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((event) => <EventRow key={event.id} event={event} />)}
                {selectedTasks.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><ListChecks className="h-3.5 w-3.5" /> Tasks due</p>
                    {selectedTasks.map((task) => (
                      <Link key={task.id} href={`/app/tasks?id=${task.id}`} className="block truncate rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/40">
                        {task.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section title="Event types">
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((type) => (
                <span key={type.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("h-2.5 w-2.5 rounded-full", type.dot)} /> {type.label}
                </span>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog?.event ? "Edit event" : "New event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={(event) => setField("title", event.target.value)} maxLength={150} required autoFocus />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => setField("type", type.key)}
                  className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors", form.type === type.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                >
                  <span className={cn("h-2 w-2 rounded-full", type.dot)} /> {type.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allDay} onChange={(event) => setField("allDay", event.target.checked)} /> All day
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Starts</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((current) => ({ ...current, startDate: value, endDate: current.endDate < value ? value : current.endDate }));
                  }}
                  required
                />
                {!form.allDay && <Input type="time" value={form.startTime} onChange={(event) => setField("startTime", event.target.value)} required />}
              </div>
              <div className="space-y-1">
                <Label>Ends</Label>
                <Input type="date" value={form.endDate} min={form.startDate} onChange={(event) => setField("endDate", event.target.value)} required />
                {!form.allDay && <Input type="time" value={form.endTime} onChange={(event) => setField("endTime", event.target.value)} required />}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Location (optional)</Label>
              <Input value={form.location} onChange={(event) => setField("location", event.target.value)} maxLength={200} />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea value={form.description} onChange={(event) => setField("description", event.target.value)} rows={3} maxLength={2000} />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex items-center justify-between gap-2 pt-1">
              {dialog?.event ? (
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={deleteEvent.isPending} onClick={remove}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
                <Button type="submit" disabled={pending || !form.title.trim()}>{pending ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}