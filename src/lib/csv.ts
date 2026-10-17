type CSVColumn<T> = { key: keyof T | string; label: string; value?: (row: T) => string | number | boolean | null | undefined };

function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV<T extends Record<string, any>>(rows: T[], columns: CSVColumn<T>[]): string {
  const header = columns.map((c) => escapeCSVField(c.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.value ? c.value(row) : row[c.key as string];
        return escapeCSVField(raw);
      })
      .join(",")
  );
  return "\uFEFF" + [header, ...lines].join("\r\n") + "\r\n";
}