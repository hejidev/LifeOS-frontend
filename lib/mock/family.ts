// src/lib/mock/family.ts
import type { FamilySummary } from "@/types/life";

export const mockFamilySummary: FamilySummary = {
  familyName: "Ejiwumi Family", // adjust to whatever you prefer
  members: [
    {
      id: "fam-parent-1",
      name: "Blessing",
      role: "parent",
      device: "Pixel 9 Pro",
      locationSharing: true,
      screenTimeToday: "3h 10m",
      status: "online",
    },
    {
      id: "fam-guardian-1",
      name: "Chinedu",
      role: "guardian",
      device: "Moto Edge",
      locationSharing: true,
      screenTimeToday: "1h 45m",
      status: "away",
    },
    {
      id: "fam-child-1",
      name: "Tola",
      role: "child",
      device: "Moto G Play",
      locationSharing: true,
      screenTimeToday: "2h 05m",
      status: "online",
    },
    {
      id: "fam-child-2",
      name: "Kemi",
      role: "child",
      device: "Moto E",
      locationSharing: false,
      screenTimeToday: "1h 20m",
      status: "offline",
    },
  ],
  controls: [
    {
      id: "control-screen-time",
      title: "Daily screen time limit",
      description: "Max screen time allowed for child profiles",
      enabled: true,
      value: "2h/day",
    },
    {
      id: "control-bedtime",
      title: "Bedtime mode",
      description: "Restrict access to apps after bedtime",
      enabled: true,
      value: "8:30 PM",
    },
    {
      id: "control-app-limits",
      title: "App limits",
      description: "Limit access to selected apps",
      enabled: true,
      value: "7 apps controlled",
    },
    {
      id: "control-location",
      title: "Location sharing",
      description: "Share real-time device location with parents",
      enabled: true,
      value: "3 devices sharing",
    },
  ],
  insight:
    "Screen time is highest after 7 PM for child profiles. Bedtime mode and app limits help maintain healthy digital habits while keeping everyone connected.",
};