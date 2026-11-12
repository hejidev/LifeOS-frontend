"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dayBounds = dayBounds;
function validZone(zone) {
    if (!zone)
        return "Africa/Lagos";
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: zone });
        return zone;
    }
    catch {
        return "Africa/Lagos";
    }
}
function offsetMs(zone, at) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(new Date(at));
    const pick = (type) => Number(parts.find((part) => part.type === type)?.value);
    const local = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute"), pick("second"));
    return local - Math.floor(at / 1000) * 1000;
}
function startOfLocalDay(dateKey, zone) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const guess = Date.UTC(year, month - 1, day);
    const first = guess - offsetMs(zone, guess);
    return new Date(guess - offsetMs(zone, first));
}
function dayBounds(timeZone, at = new Date()) {
    const zone = validZone(timeZone);
    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
    const [year, month, day] = dateKey.split("-").map(Number);
    const nextKey = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
    return {
        zone,
        dateKey,
        start: startOfLocalDay(dateKey, zone),
        end: startOfLocalDay(nextKey, zone),
        dateOnly: new Date(`${dateKey}T00:00:00.000Z`),
    };
}
