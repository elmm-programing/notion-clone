// Pure helpers for database views: filtering, sorting, and cell access.

import type { DbProperty, Json, Page } from "@/types/database";

export type ValueMap = Map<string, Json | null>;

export type DbSort = { propertyId: string; dir: "asc" | "desc" };

export type DbFilterOp =
  | "contains"
  | "equals"
  | "empty"
  | "not_empty"
  | "checked"
  | "unchecked";

export type DbFilter = { propertyId: string; op: DbFilterOp; value?: string };

export type ViewConfig = {
  sorts?: DbSort[];
  filters?: DbFilter[];
  groupBy?: string | null;
};

// Pseudo-property id for a row's page title (the first column).
export const TITLE_PROP = "__title__";

export function valueKey(rowId: string, propertyId: string): string {
  return `${rowId}:${propertyId}`;
}

export function getCellValue(
  row: Page,
  propertyId: string,
  valueMap: ValueMap,
): Json | null {
  if (propertyId === TITLE_PROP) return row.title ?? "";
  return valueMap.get(valueKey(row.id, propertyId)) ?? null;
}

function isEmpty(v: Json | null): boolean {
  return v == null || v === "";
}

function matchFilter(row: Page, f: DbFilter, valueMap: ValueMap): boolean {
  const v = getCellValue(row, f.propertyId, valueMap);
  const needle = (f.value ?? "").toLowerCase();
  switch (f.op) {
    case "empty":
      return isEmpty(v);
    case "not_empty":
      return !isEmpty(v);
    case "checked":
      return v === true;
    case "unchecked":
      return v !== true;
    case "equals":
      return String(v ?? "").toLowerCase() === needle;
    case "contains":
      return String(v ?? "")
        .toLowerCase()
        .includes(needle);
    default:
      return true;
  }
}

export function applyFilters(
  rows: Page[],
  filters: DbFilter[],
  valueMap: ValueMap,
): Page[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) => filters.every((f) => matchFilter(row, f, valueMap)));
}

function compareValues(a: Json | null, b: Json | null): number {
  const ae = isEmpty(a);
  const be = isEmpty(b);
  if (ae && be) return 0;
  if (ae) return 1; // empties sort last
  if (be) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export function applySorts(
  rows: Page[],
  sorts: DbSort[],
  valueMap: ValueMap,
): Page[] {
  if (sorts.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const s of sorts) {
      const c = compareValues(
        getCellValue(a, s.propertyId, valueMap),
        getCellValue(b, s.propertyId, valueMap),
      );
      if (c !== 0) return s.dir === "asc" ? c : -c;
    }
    return 0;
  });
}

// Distinct option columns for a board grouped by `property`: configured options
// plus any values present in the data, in a stable order.
export function boardColumns(
  property: DbProperty,
  rows: Page[],
  valueMap: ValueMap,
): string[] {
  const seen = new Set<string>(property.config.options ?? []);
  for (const row of rows) {
    const v = getCellValue(row, property.id, valueMap);
    if (typeof v === "string" && v) seen.add(v);
  }
  return [...seen];
}
