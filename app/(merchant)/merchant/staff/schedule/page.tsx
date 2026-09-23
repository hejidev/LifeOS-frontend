"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, Trash2, User, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMerchantStaff, useStaffShifts, useCreateStaffShift, useUpdateStaffShift, useDeleteStaffShift } from "@/lib/hooks/use-life-data";
import { useStoreContext } from "@/lib/context/store-context";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  return date;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const STAFF_COLORS = [
  "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "bg-purple-500/10 text-purple-700 border-purple-500/20",
  "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "bg-amber-500/10 text-amber-700 border-amber-500/20",
  "bg-pink-500/10 text-pink-700 border-pink-500/20",
  "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
];

export default function StaffSchedulePage() {
  const { data: staff = [] } = useMerchantStaff();
  const { stores } = useStoreContext();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const { data: shifts = [] } = useStaffShifts({ from: weekStart.toISOString(), to: weekEnd.toISOString() });
  const createShift = useCreateStaffShift();
  const updateShift = useUpdateStaffShift();
  const deleteShift = useDeleteStaffShift();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [form, setForm] = useState({ staffId: "", date: "", startTime: "09:00", endTime: "17:00", storeId: "", note: "" });

  const staffColor = (staffId: string) => {
    const idx = (staff as any[]).findIndex((s) => s.id === staffId);
    return STAFF_COLORS[idx % STAFF_COLORS.length] ?? STAFF_COLORS[0];
  };

  function shiftsForDay(day: Date) {
    const dayStr = toISODate(day);
    return (shifts as any[])
      .filter((s) => toISODate(new Date(s.startsAt)) === dayStr)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  function openCreate(day?: Date) {
    setEditingShift(null);
    setForm({
      staffId: staff[0]?.id ?? "",
      date: day ? toISODate(day) : toISODate(new Date()),
      startTime: "09:00",
      endTime: "17:00",
      storeId: "",
      note: "",
    });
    setDialogOpen(true);
  }

  function openEdit(s: any) {
    const start = new Date(s.startsAt);
    const end = new Date(s.endsAt);
    setEditingShift(s);
    setForm({
      staffId: s.staffId,
      date: toISODate(start),
      startTime: start.toTimeString().slice(0, 5),
      endTime: end.toTimeString().slice(0, 5),
      storeId: s.storeId ?? "",
      note: s.note ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      staffId: form.staffId,
      startsAt: new Date(`${form.date}T${form.startTime}:00`).toISOString(),
      endsAt: new Date(`${form.date}T${form.endTime}:00`).toISOString(),
      storeId: form.storeId || undefined,
      note: form.note || undefined,
    };
    if (editingShift) {
      updateShift.mutate({ id: editingShift.id, data: payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createShift.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  }

  function handleDelete() {
    if (!editingShift) return;
    if (confirm(`Remove this shift for ${editingShift.staffName}?`)) {
      deleteShift.mutate(editingShift.id, { onSuccess: () => setDialogOpen(false) });
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-linear-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Staff Schedule</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Plan who's working, and when</p>
          </div>
        </div>
        <Button onClick={() => openCreate()} className="gap-2">
          <Plus className="h-4 w-4" /> Add Shift
        </Button>
      </motion.div>

      <motion.div variants={item} className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium">
          {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {days[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {days.map((day, i) => {
          const dayShifts = shiftsForDay(day);
          const isToday = toISODate(day) === toISODate(new Date());
          return (
            <Card key={i} className={isToday ? "border-primary/40" : ""}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">{DAY_LABELS[i]}</p>
                    <p className="text-[11px] text-muted-foreground">{day.getDate()}</p>
                  </div>
                  <button onClick={() => openCreate(day)} className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 min-h-16">
                  {dayShifts.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/50 py-2 text-center">No shifts</p>
                  ) : (
                    dayShifts.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => openEdit(s)}
                        className={`w-full text-left rounded-lg border px-2 py-1.5 text-[11px] hover:opacity-80 transition-opacity ${staffColor(s.staffId)}`}
                      >
                        <p className="font-semibold truncate">{s.staffName}</p>
                        <p className="flex items-center gap-1 opacity-80">
                          <Clock className="h-2.5 w-2.5" /> {formatTime(s.startsAt)}–{formatTime(s.endsAt)}
                        </p>
                        {s.storeName && (
                          <p className="flex items-center gap-1 opacity-70 truncate">
                            <MapPin className="h-2.5 w-2.5" /> {s.storeName}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingShift ? "Edit shift" : "Add shift"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><User className="h-3 w-3" /> Staff member</Label>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={form.staffId}
                onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
                required
              >
                {(staff as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End time</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} required />
              </div>
            </div>
            {stores.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Location (optional)</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={form.storeId}
                  onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
                >
                  <option value="">Any location</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Note (optional)</Label>
              <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. covering for Ada" />
            </div>
            <div className="flex gap-2 pt-1">
              {editingShift && (
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={createShift.isPending || updateShift.isPending}>
                {createShift.isPending || updateShift.isPending ? "Saving..." : editingShift ? "Save changes" : "Add shift"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}