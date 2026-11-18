"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  type: string;
}

export function useCalendarWindow(from: string, to: string) {
  return useQuery<CalendarEvent[]>({
    queryKey: ["calendarEvents", "window", from, to],
    queryFn: () => api.get(`/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then((data) => data.events),
    placeholderData: (previous) => previous,
  });
}