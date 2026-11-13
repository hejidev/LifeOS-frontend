"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateLock = evaluateLock;
exports.loadLockRules = loadLockRules;
const prisma_1 = require("../config/prisma");
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function localParts(zone, at) {
    let parts;
    try {
        parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(at);
    }
    catch {
        parts = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", weekday: "short", hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(at);
    }
    const pick = (type) => parts.find((part) => part.type === type)?.value ?? "0";
    return { weekday: WEEKDAYS.indexOf(pick("weekday")), minutes: Number(pick("hour")) * 60 + Number(pick("minute")) };
}
function evaluateLock(rules, at = new Date()) {
    const now = at.getTime();
    const active = rules.overrides.filter((override) => override.until.getTime() > now);
    const forced = active.find((override) => override.kind === "LOCK");
    if (forced)
        return { locked: true, until: forced.until, source: "parent" };
    if (active.some((override) => override.kind === "UNLOCK"))
        return { locked: false, until: null, source: "parent" };
    const { weekday, minutes } = localParts(rules.zone, at);
    let longest = 0;
    for (const schedule of rules.schedules) {
        const overnight = schedule.endMin <= schedule.startMin;
        const today = schedule.days.includes(weekday);
        const yesterday = schedule.days.includes((weekday + 6) % 7);
        let remaining = 0;
        if (!overnight) {
            if (today && minutes >= schedule.startMin && minutes < schedule.endMin)
                remaining = schedule.endMin - minutes;
        }
        else if (today && minutes >= schedule.startMin) {
            remaining = 24 * 60 - minutes + schedule.endMin;
        }
        else if (yesterday && minutes < schedule.endMin) {
            remaining = schedule.endMin - minutes;
        }
        if (remaining > longest)
            longest = remaining;
    }
    if (longest === 0)
        return { locked: false, until: null, source: null };
    const elapsedInMinute = at.getUTCSeconds() * 1000 + at.getUTCMilliseconds();
    return { locked: true, until: new Date(now + longest * 60000 - elapsedInMinute), source: "bedtime" };
}
async function loadLockRules(childUserId) {
    const member = await prisma_1.prisma.familyMember.findUnique({
        where: { memberUserId: childUserId },
        select: {
            user: { select: { timezone: true } },
            schedules: { where: { enabled: true }, select: { days: true, startMin: true, endMin: true } },
            overrides: { where: { until: { gt: new Date(Date.now() - 86400000) } }, select: { kind: true, until: true } },
        },
    });
    if (!member)
        return null;
    return { zone: member.user.timezone || "Africa/Lagos", schedules: member.schedules, overrides: member.overrides };
}
