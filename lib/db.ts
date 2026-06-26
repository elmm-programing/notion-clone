// Pure helpers for database views: filtering, sorting, and cell access.

import type {
  DbProperty,
  Json,
  Page,
  WorkspaceMemberInfo,
} from "@/types/database";

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
  dateProp?: string | null;
  hidden?: string[]; // property ids hidden in the table view
  widths?: Record<string, number>; // column id -> px (TITLE_PROP for Name)
};

export type PropsById = Map<string, DbProperty>;

// Pseudo-property id for a row's page title (the first column).
export const TITLE_PROP = "__title__";

export function valueKey(rowId: string, propertyId: string): string {
  return `${rowId}:${propertyId}`;
}

// Value for a known property (type-aware: created/edited derive from the row).
export function getCellValue(
  row: Page,
  property: DbProperty,
  valueMap: ValueMap,
): Json | null {
  if (property.type === "created_time") return row.created_at ?? null;
  if (property.type === "edited_time") return row.updated_at ?? null;
  return valueMap.get(valueKey(row.id, property.id)) ?? null;
}

// Value by property id (also resolves the Name pseudo-column) — for filter/sort.
function cellById(
  row: Page,
  propertyId: string,
  propsById: PropsById,
  valueMap: ValueMap,
): Json | null {
  if (propertyId === TITLE_PROP) return row.title ?? "";
  const p = propsById.get(propertyId);
  if (!p) return valueMap.get(valueKey(row.id, propertyId)) ?? null;
  return getCellValue(row, p, valueMap);
}

// Human-readable display of a cell value (person -> email, arrays -> joined…).
export function formatCellValue(
  property: DbProperty,
  value: Json | null,
  members: WorkspaceMemberInfo[],
): string {
  if (value == null || value === "") return "";
  if (property.type === "checkbox") return value === true ? "✓" : "";
  if (property.type === "person") {
    const m = members.find((x) => x.user_id === value);
    return m?.email ?? String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((x) =>
        x && typeof x === "object"
          ? ((x as { name?: string }).name ?? "")
          : String(x),
      )
      .filter(Boolean)
      .join(", ");
  }
  if (
    property.type === "date" ||
    property.type === "created_time" ||
    property.type === "edited_time"
  ) {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }
  return String(value);
}

function isEmpty(v: Json | null): boolean {
  return v == null || v === "";
}

function matchFilter(
  row: Page,
  f: DbFilter,
  propsById: PropsById,
  valueMap: ValueMap,
): boolean {
  const v = cellById(row, f.propertyId, propsById, valueMap);
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
  propsById: PropsById,
  valueMap: ValueMap,
): Page[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((f) => matchFilter(row, f, propsById, valueMap)),
  );
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
  propsById: PropsById,
  valueMap: ValueMap,
): Page[] {
  if (sorts.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const s of sorts) {
      const c = compareValues(
        cellById(a, s.propertyId, propsById, valueMap),
        cellById(b, s.propertyId, propsById, valueMap),
      );
      if (c !== 0) return s.dir === "asc" ? c : -c;
    }
    return 0;
  });
}

// Distinct option columns for a board grouped by `property`.
export function boardColumns(
  property: DbProperty,
  rows: Page[],
  valueMap: ValueMap,
): string[] {
  const seen = new Set<string>(property.config.options ?? []);
  for (const row of rows) {
    const v = getCellValue(row, property, valueMap);
    if (typeof v === "string" && v) seen.add(v);
  }
  return [...seen];
}

export type RowGroup = { key: string; label: string; rows: Page[] };

// Group rows by a property's value (configured options + values present +
// an "empty" group), preserving the incoming row order within each group.
export function groupRows(
  property: DbProperty,
  rows: Page[],
  valueMap: ValueMap,
): RowGroup[] {
  const cols = boardColumns(property, rows, valueMap);
  const groups: RowGroup[] = cols.map((opt) => ({
    key: opt,
    label: opt,
    rows: rows.filter((r) => getCellValue(r, property, valueMap) === opt),
  }));
  const empty = rows.filter((r) => {
    const v = getCellValue(r, property, valueMap);
    return v == null || v === "";
  });
  if (empty.length)
    groups.push({ key: "__none__", label: "No value", rows: empty });
  return groups.filter((g) => g.rows.length > 0);
}
