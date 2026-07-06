/**
 * Minimal, dependency-free CSV parser (#19).
 * Handles: quoted fields, embedded commas/quotes/newlines, CRLF, UTF-8 BOM.
 * Excel users just "Save As → CSV" — no xlsx library needed.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, ""); // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row); // skip blank lines
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

/** First row = headers (case/space-insensitive) → array of objects. */
export function csvToObjects(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const parsed = parseCsv(text);
  if (parsed.length === 0) return { headers: [], rows: [] };
  const headers = parsed[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows = parsed.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}
