import { prisma } from "../config/prisma";

export interface LockSchedule {
  days: number[];
  startMin: number;
  endMin: number;
}

export interface LockOverride {
  kind: string;
  until: Date;
}

export interface LockRules {
  zone: string;
  schedules: LockSchedule[];
  overrides: LockOverride[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localParts(zone: string, at: Date) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(at);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", weekday: "short", hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(at);
  }
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
  return { weekday: WEEKDAYS.indexOf(pick("weekday")), minutes: Number(pick("hour")) * 60 + Number(pick("minute")) };
}

export function evaluateLock(rules: LockRules, at: Date = new Date()) {
  const now = at.getTime();
  const active = rules.overrides.filter((override) => override.until.getTime() > now);

  const forced = active.find((override) => override.kind === "LOCK");
  if (forced) return { locked: true, until: forced.until, source: "parent" as const };
  if (active.some((override) => override.kind === "UNLOCK")) return { locked: false, until: null, source: "parent" as const };

  const { weekday, minutes } = localParts(rules.zone, at);
  let longest = 0;

  for (const schedule of rules.schedules) {
    const overnight = schedule.endMin <= schedule.startMin;
    const today = schedule.days.includes(weekday);
    const yesterday = schedule.days.includes((weekday + 6) % 7);
    let remaining = 0;

    if (!overnight) {
      if (today && minutes >= schedule.startMin && minutes < schedule.endMin) remaining = schedule.endMin - minutes;
    } else if (today && minutes >= schedule.startMin) {
      remaining = 24 * 60 - minutes + schedule.endMin;
    } else if (yesterday && minutes < schedule.endMin) {
      remaining = schedule.endMin - minutes;
    }
    if (remaining > longest) longest = remaining;
  }

  if (longest === 0) return { locked: false, until: null, source: null };
  const elapsedInMinute = at.getUTCSeconds() * 1000 + at.getUTCMilliseconds();
  return { locked: true, until: new Date(now + longest * 60_000 - elapsedInMinute), source: "bedtime" as const };
}

export async function loadLockRules(childUserId: string): Promise<LockRules | null> {
  const member = await prisma.familyMember.findUnique({
    where: { memberUserId: childUserId },
    select: {
      user: { select: { timezone: true } },
      schedules: { where: { enabled: true }, select: { days: true, startMin: true, endMin: true } },
      overrides: { where: { until: { gt: new Date(Date.now() - 86_400_000) } }, select: { kind: true, until: true } },
    },
  });
  if (!member) return null;
  return { zone: member.user.timezone || "Africa/Lagos", schedules: member.schedules, overrides: member.overrides };
}