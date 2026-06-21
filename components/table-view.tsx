"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { DbCell, EditableText } from "@/components/db-cell";
import { getCellValue, type DbSort, type ValueMap } from "@/lib/db";
import type { DbProperty, DbPropertyType, Json, Page } from "@/types/database";

const TYPE_LABELS: Record<DbPropertyType, string> = {
  text: "Text",
  number: "Number",
  select: "Select",
  checkbox: "Checkbox",
  date: "Date",
  url: "URL",
};

export function TableView({
  properties,
  rows,
  valueMap,
  sorts,
  onToggleSort,
  onCommitValue,
  onRowTitle,
  onDeleteRow,
  onOpenRow,
  onCreateRow,
  onRenameProp,
  onRetypeProp,
  onDeleteProp,
  onAddProp,
  canCreate,
}: {
  properties: DbProperty[];
  rows: Page[];
  valueMap: ValueMap;
  sorts: DbSort[];
  onToggleSort: (propertyId: string) => void;
  onCommitValue: (row: Page, property: DbProperty, value: Json | null) => void;
  onRowTitle: (rowId: string, title: string) => void;
  onDeleteRow: (rowId: string) => void;
  onOpenRow: (rowId: string) => void;
  onCreateRow: () => void;
  onRenameProp: (id: string, name: string) => void;
  onRetypeProp: (id: string, type: DbPropertyType) => void;
  onDeleteProp: (id: string) => void;
  onAddProp: () => void;
  canCreate: boolean;
}) {
  function sortDir(propertyId: string): "asc" | "desc" | undefined {
    return sorts.find((s) => s.propertyId === propertyId)?.dir;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-border text-left text-muted-foreground">
              <th className="min-w-48 px-2 py-1.5 font-medium">
                <button
                  onClick={() => onToggleSort("__title__")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Name <SortIcon dir={sortDir("__title__")} />
                </button>
              </th>
              {properties.map((property) => (
                <th
                  key={property.id}
                  className="min-w-40 border-l border-border px-2 py-1.5 font-medium"
                >
                  <div className="flex items-center justify-between gap-1">
                    <PropertyHeader
                      property={property}
                      onRename={(name) => onRenameProp(property.id, name)}
                      onRetype={(type) => onRetypeProp(property.id, type)}
                      onDelete={() => onDeleteProp(property.id)}
                    />
                    <button
                      onClick={() => onToggleSort(property.id)}
                      className="shrink-0 hover:text-foreground"
                      title="Sort"
                    >
                      <SortIcon dir={sortDir(property.id)} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="border-l border-border px-2 py-1.5">
                <button
                  onClick={onAddProp}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  title="Add property"
                >
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="group border-b border-border">
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1">
                    <EditableText
                      value={row.title}
                      placeholder="Untitled"
                      onCommit={(t) => onRowTitle(row.id, t)}
                      className="flex-1"
                    />
                    <button
                      onClick={() => onOpenRow(row.id)}
                      className="hidden text-xs text-muted-foreground hover:text-foreground group-hover:block"
                      title="Open as page"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => onDeleteRow(row.id)}
                      className="hidden text-muted-foreground hover:text-red-500 group-hover:block"
                      title="Delete row"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
                {properties.map((property) => (
                  <td
                    key={property.id}
                    className="border-l border-border px-2 py-1"
                  >
                    <DbCell
                      property={property}
                      value={getCellValue(row, property.id, valueMap)}
                      onCommit={(v) => onCommitValue(row, property, v)}
                    />
                  </td>
                ))}
                <td className="border-l border-border" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={onCreateRow}
        disabled={!canCreate}
        className="mt-2 flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <Plus size={14} /> New row
      </button>
    </div>
  );
}

function SortIcon({ dir }: { dir?: "asc" | "desc" }) {
  if (dir === "asc") return <ArrowUp size={12} />;
  if (dir === "desc") return <ArrowDown size={12} />;
  return <span className="inline-block w-3" />;
}

function PropertyHeader({
  property,
  onRename,
  onRetype,
  onDelete,
}: {
  property: DbProperty;
  onRename: (name: string) => void;
  onRetype: (type: DbPropertyType) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative min-w-0 flex-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full truncate text-left hover:text-foreground"
      >
        {property.name}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-52 rounded-md border border-border bg-background p-2 shadow-lg">
            <input
              defaultValue={property.name}
              onBlur={(e) => onRename(e.target.value.trim() || "Property")}
              className="mb-2 w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none"
            />
            <select
              value={property.type}
              onChange={(e) => onRetype(e.target.value as DbPropertyType)}
              className="mb-2 w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none"
            >
              {(Object.keys(TYPE_LABELS) as DbPropertyType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-accent"
            >
              <Trash2 size={12} /> Delete property
            </button>
          </div>
        </>
      )}
    </div>
  );
}
