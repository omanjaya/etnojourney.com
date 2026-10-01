/**
 * CSV helpers (RFC 4180) with spreadsheet formula-injection protection.
 *
 * Cells that a spreadsheet would treat as a formula (starting with
 * `= + - @`, a tab or a carriage return) are prefixed with an apostrophe so
 * Excel/Sheets show them as text instead of executing them (OWASP guidance).
 */
export type CsvCell = string | number | null | undefined;

/** Excel needs a BOM to read UTF-8 CSV correctly. */
export const CSV_BOM = "﻿";

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function neutralizeFormula(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function escapeCsvCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return "";
  // Numbers are emitted as-is so negative amounts stay numeric.
  if (typeof cell === "number") return Number.isFinite(cell) ? String(cell) : "";
  const safe = neutralizeFormula(cell);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** One CSV record terminated by CRLF, as RFC 4180 specifies. */
export function csvRow(cells: CsvCell[]): string {
  return `${cells.map(escapeCsvCell).join(",")}\r\n`;
}
