import type { UserProfile } from "@/types/life";

export const mockUser: UserProfile = {
  id: "user-1",
  name: "Basheer Ejiwumi",
  email: "basheer@lifeos.app",
  avatarUrl: undefined,
  currency: "NGN",
  notifications: { notifyTasks: true, notifyCalendar: true, notifyFinance: false },
  timezone: "Africa/Lagos",
  role: "user",
  location: "Lagos, Nigeria",
  preferences: {
    darkMode: true,
    weekStartsOn: 1,
  },
};
