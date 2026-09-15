// Minimal RFC 4180 CSV writer + UTF-8 BOM. Hand-assembled — no dependency.
// The BOM ("﻿") makes Excel detect UTF-8 and render Nepali script.

export function escapeCsvField(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(escapeCsvField).join(",")).join("\n");
}

export function withBom(csv: string): string {
  return `﻿${csv}`;
}