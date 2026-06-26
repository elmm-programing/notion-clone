"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { DbCell, EditableText } from "@/components/db-cell";
import {
  getCellValue,
  groupRows,
  TITLE_PROP,
  type DbSort,
  type ValueMap,
} from "@/lib/db";
import type {
  DbProperty,
  DbPropertyType,
  Json,
  Page,
  WorkspaceMemberInfo,
} from "@/types/database";

const TYPE_LABELS: Record<DbPropertyType, string> = {
  text: "Text",
  number: "Number",
  select: "Select",
  multi_select: "Multi-select",
  person: "Person",
  files: "Files",
  checkbox: "Checkbox",
  date: "Date",
  url: "URL",
  created_time: "Created time",
  edited_time: "Edited time",
};

export function TableView({
  properties,
  rows,
  valueMap,
  members,
  sorts,
  groupByProperty,
  widths,
  onResize,
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
  members: WorkspaceMemberInfo[];
  sorts: DbSort[];
  groupByProperty: DbProperty | null;
  widths: Record<string, number>;
  onResize: (id: string, width: number) => void;
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
  // Live width during a drag (committed on pointer-up).
  const [drag, setDrag] = useState<{ id: string; w: number } | null>(null);
  const [start, setStart] = useState<{ x: number; w: number } | null>(null);

  useEffect(() => {
    if (!drag || !start) return;
    function move(e: PointerEvent) {
      const w = Math.max(80, start!.w + (e.clientX - start!.x));
      setDrag((d) => (d ? { ...d, w } : d));
    }
    function up() {
      setDrag((d) => {
        if (d) onResize(d.id, d.w);
        return null;
      });
      setStart(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, start, onResize]);

  function widthOf(id: string): number | undefined {
    if (drag && drag.id === id) return drag.w;
    return widths[id];
  }
  function startResize(id: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const w = widths[id] ?? 160;
    setStart({ x: e.clientX, w });
    setDrag({ id, w });
  }

  function sortDir(propertyId: string): "asc" | "desc" | undefined {
    return sorts.find((s) => s.propertyId === propertyId)?.dir;
  }

  const colCount = properties.length + 2;
  const groups = groupByProperty
    ? groupRows(groupByProperty, rows, valueMap)
    : null;

  function renderRow(row: Page) {
    return (
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
          <td key={property.id} className="border-l border-border px-2 py-1">
            <DbCell
              property={property}
              value={getCellValue(row, property.id, valueMap)}
              row={row}
              members={members}
              onCommit={(v) => onCommitValue(row, property, v)}
            />
          </td>
        ))}
        <td className="border-l border-border" />
      </tr>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: widthOf(TITLE_PROP) ?? 220 }} />
            {properties.map((p) => (
              <col key={p.id} style={{ width: widthOf(p.id) ?? 160 }} />
            ))}
            <col style={{ width: 40 }} />
          </colgroup>
          <thead>
            <tr className="border-y border-border text-left text-muted-foreground">
              <th className="relative px-2 py-1.5 font-medium">
                <button
                  onClick={() => onToggleSort(TITLE_PROP)}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Name <SortIcon dir={sortDir(TITLE_PROP)} />
                </button>
                <ResizeHandle onDown={(e) => startResize(TITLE_PROP, e)} />
              </th>
              {properties.map((property) => (
                <th
                  key={property.id}
                  className="relative border-l border-border px-2 py-1.5 font-medium"
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
                  <ResizeHandle onDown={(e) => startResize(property.id, e)} />
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

          {groups ? (
            groups.map((g) => (
              <tbody key={g.key}>
                <tr className="bg-muted/40">
                  <td
                    colSpan={colCount}
                    className="px-2 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {g.label} · {g.rows.length}
                  </td>
                </tr>
                {g.rows.map(renderRow)}
              </tbody>
            ))
          ) : (
            <tbody>{rows.map(renderRow)}</tbody>
          )}
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

function ResizeHandle({ onDown }: { onDown: (e: React.PointerEvent) => void }) {
  return (
    <div
      onPointerDown={onDown}
      className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-foreground/20"
    />
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
