import type { CalendarEvent } from "@/types/life";

const today = new Date();
const todayStr = today.toISOString().split("T")[0];

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: "event-1",
    title: "Team Standup",
    start: `${todayStr}T09:30:00`,
    end: `${todayStr}T10:00:00`,
    type: "meeting",
    location: "Zoom",
  },
  {
    id: "event-2",
    title: "Client Review Call",
    start: `${todayStr}T14:00:00`,
    end: `${todayStr}T15:00:00`,
    type: "meeting",
    location: "Google Meet",
  },
  {
    id: "event-3",
    title: "Gym Session",
    start: `${todayStr}T18:00:00`,
    end: `${todayStr}T19:00:00`,
    type: "personal",
    location: "FitLife Gym",
  },
  {
    id: "event-4",
    title: "Project Deadline",
    start: `${todayStr}T17:00:00`,
    end: `${todayStr}T17:00:00`,
    type: "deadline",
  },
  {
    id: "event-5",
    title: "1:1 with Manager",
    start: new Date(Date.now() + 86400000).toISOString().split("T")[0] + "T11:00:00",
    end: new Date(Date.now() + 86400000).toISOString().split("T")[0] + "T11:30:00",
    type: "meeting",
    location: "Office - Room 4B",
  },
];
