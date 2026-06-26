"use client";

import { Plus } from "lucide-react";
import { formatCellValue, getCellValue, type ValueMap } from "@/lib/db";
import type { DbProperty, Page, WorkspaceMemberInfo } from "@/types/database";

export function GalleryView({
  properties,
  rows,
  valueMap,
  members,
  onOpenRow,
  onCreateRow,
  canCreate,
}: {
  properties: DbProperty[];
  rows: Page[];
  valueMap: ValueMap;
  members: WorkspaceMemberInfo[];
  onOpenRow: (rowId: string) => void;
  onCreateRow: () => void;
  canCreate: boolean;
}) {
  const shown = properties.slice(0, 4);
  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {rows.map((row) => (
          <button
            key={row.id}
            onClick={() => onOpenRow(row.id)}
            className="rounded-lg border border-border bg-background p-3 text-left hover:bg-accent"
          >
            <div className="mb-2 truncate text-sm font-medium">
              {row.title || "Untitled"}
            </div>
            <div className="space-y-0.5">
              {shown.map((p) => {
                const text = formatCellValue(
                  p,
                  getCellValue(row, p, valueMap),
                  members,
                );
                if (!text) return null;
                return (
                  <div key={p.id} className="truncate text-xs text-muted-foreground">
                    <span className="opacity-60">{p.name}: </span>
                    {text}
                  </div>
                );
              })}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onCreateRow}
        disabled={!canCreate}
        className="mt-3 flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <Plus size={14} /> New
      </button>
    </div>
  );
}
