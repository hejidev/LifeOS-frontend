export interface LocalParts {
    dateKey: string;
    monthKey: string;
    hour: number;
    weekday: number;
  }
  
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  export function localParts(zone: string, at: Date = new Date()): LocalParts | null {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
        weekday: "short",
      }).formatToParts(at);
      const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
      const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
      return { dateKey, monthKey: dateKey.slice(0, 7), hour: parseInt(get("hour"), 10) % 24, weekday: DAYS.indexOf(get("weekday")) };
    } catch {
      return null;
    }
  }
  
  export const safeZone = (zone: string) => (localParts(zone) ? zone : "Africa/Lagos");