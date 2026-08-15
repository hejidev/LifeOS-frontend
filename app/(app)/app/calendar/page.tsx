"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Plus, Trash2, MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from "@/lib/hooks/use-life-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const TYPE_COLORS: Record<string, string> = { MEETING: "bg-sky-500", PERSONAL: "bg-emerald-500", DEADLINE: "bg-destructive", REMINDER: "bg-amber-500", OTHER: "bg-muted-foreground" };

function toLocalInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function groupByDay(events: any[]) {
  const groups: Record<string, any[]> = {};
  for (const e of events) {
    const key = new Date(e.start).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}
const emptyForm = { title: "", description: "", start: "", end: "", location: "", type: "MEETING" };

export default function CalendarPage() {
  const [range, setRange] = useState<"today" | "week" | "month">("week");
  const { data: events = [], isLoading } = useCalendarEvents(range);
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() { setEditingId(null); setForm(emptyForm); setOpen(true); }
  function openEdit(e: any) {
    setEditingId(e.id);
    setForm({ title: e.title, description: e.description ?? "", start: toLocalInputValue(e.start), end: toLocalInputValue(e.end), location: e.location ?? "", type: e.type });
    setOpen(true);
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const payload = { title: form.title, description: form.description || undefined, start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString(), location: form.location || undefined, type: form.type };
    if (editingId) updateEvent.mutate({ id: editingId, data: payload }, { onSuccess: () => setOpen(false) });
    else createEvent.mutate(payload, { onSuccess: () => setOpen(false) });
  }

  const grouped = groupByDay(events as any[]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2"><CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your schedule, all in one place.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New event</Button>
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
          <TabsList><TabsTrigger value="today">Today</TabsTrigger><TabsTrigger value="week">This week</TabsTrigger><TabsTrigger value="month">This month</TabsTrigger></TabsList>
        </Tabs>
      </motion.div>

      <motion.div variants={item} className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No events in this period.</p>
        ) : (
          Object.entries(grouped).map(([day, dayEvents]) => (
            <div key={day}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{new Date(day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
              <div className="space-y-2">
                {dayEvents.map((e: any) => (
                  <Card key={e.id} className="hover:border-primary/20 transition-colors cursor-pointer" onClick={() => openEdit(e)}>
                    <CardContent className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${TYPE_COLORS[e.type] ?? "bg-muted-foreground"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(e.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={(ev) => { ev.stopPropagation(); deleteEvent.mutate(e.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Starts</Label><Input type="datetime-local" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Ends</Label><Input type="datetime-local" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} required /></div>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {Object.keys(TYPE_COLORS).map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Location (optional)</Label><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Description (optional)</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <Button type="submit" className="w-full" disabled={createEvent.isPending || updateEvent.isPending}>{createEvent.isPending || updateEvent.isPending ? "Saving..." : "Save"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}