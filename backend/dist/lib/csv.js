"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCSV = toCSV;
function escapeCSVField(value) {
    if (value === null || value === undefined)
        return "";
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
function toCSV(rows, columns) {
    const header = columns.map((c) => escapeCSVField(c.label)).join(",");
    const lines = rows.map((row) => columns
        .map((c) => {
        const raw = c.value ? c.value(row) : row[c.key];
        return escapeCSVField(raw);
    })
        .join(","));
    return "\uFEFF" + [header, ...lines].join("\r\n") + "\r\n";
}
