"use client";

import { Plus, Trash2 } from "lucide-react";
import { EditableText } from "@/components/db-cell";
import { getCellValue, type ValueMap } from "@/lib/db";
import type { DbProperty, Json, Page } from "@/types/database";

function display(v: Json | null): string {
  if (v == null || v === "") return "";
  if (v === true) return "✓";
  if (v === false) return "";
  return String(v);
}

export function ListView({
  properties,
  rows,
  valueMap,
  onRowTitle,
  onOpenRow,
  onDeleteRow,
  onCreateRow,
  canCreate,
}: {
  properties: DbProperty[];
  rows: Page[];
  valueMap: ValueMap;
  onRowTitle: (rowId: string, title: string) => void;
  onOpenRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onCreateRow: () => void;
  canCreate: boolean;
}) {
  const summaryProps = properties.slice(0, 3);
  return (
    <div>
      <div className="divide-y divide-border border-y border-border">
        {rows.map((row) => (
          <div
            key={row.id}
            className="group flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
          >
            <EditableText
              value={row.title}
              placeholder="Untitled"
              onCommit={(t) => onRowTitle(row.id, t)}
              className="min-w-0 flex-1"
            />
            <div className="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground md:flex">
              {summaryProps.map((p) => {
                const text = display(getCellValue(row, p.id, valueMap));
                if (!text) return null;
                return (
                  <span key={p.id} className="max-w-40 truncate">
                    {text}
                  </span>
                );
              })}
            </div>
            <button
              onClick={() => onOpenRow(row.id)}
              className="hidden shrink-0 text-xs text-muted-foreground hover:text-foreground group-hover:block"
            >
              Open
            </button>
            <button
              onClick={() => onDeleteRow(row.id)}
              className="hidden shrink-0 text-muted-foreground hover:text-red-500 group-hover:block"
              title="Delete row"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
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
