// components/merchant/dashboard-range-selector.tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from "react-day-picker";

export type DashboardRangeValue =
  | { mode: "preset"; range: "today" | "week" | "month" | "year" }
  | { mode: "custom"; from: Date; to: Date };

export function DashboardRangeSelector({
  value,
  onChange,
}: {
  value: DashboardRangeValue;
  onChange: (value: DashboardRangeValue) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(
    value.mode === "custom" ? { from: value.from, to: value.to } : undefined
  );

  function applyCustom() {
    if (draft?.from) {
      onChange({ mode: "custom", from: draft.from, to: draft.to ?? draft.from });
      setCustomOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tabs
        value={value.mode === "preset" ? value.range : "custom"}
        onValueChange={(v) => {
          if (v === "custom") { setCustomOpen(true); return; }
          onChange({ mode: "preset", range: v as any });
        }}
        className="bg-muted/50 p-1 rounded-lg"
      >
        <TabsList className="bg-transparent h-9">
          <TabsTrigger value="today" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Today</TabsTrigger>
          <TabsTrigger value="week" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Week</TabsTrigger>
          <TabsTrigger value="month" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Month</TabsTrigger>
          <TabsTrigger value="year" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Year</TabsTrigger>
        </TabsList>
      </Tabs>

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button variant={value.mode === "custom" ? "default" : "outline"} size="sm" className="h-9 gap-1.5" onClick={() => setCustomOpen(true)}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {value.mode === "custom"
              ? `${format(value.from, "MMM d")}${value.to.getTime() !== value.from.getTime() ? ` – ${format(value.to, "MMM d")}` : ""}`
              : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <Calendar mode="range" selected={draft} onSelect={setDraft} numberOfMonths={2} defaultMonth={draft?.from} disabled={{ after: new Date() }} />
          <div className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
            <Button size="sm" variant="outline" onClick={() => setCustomOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={applyCustom} disabled={!draft?.from}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}