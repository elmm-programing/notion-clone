"use client";

import { Plus } from "lucide-react";
import { getCellValue, type ValueMap } from "@/lib/db";
import type { DbProperty, Json, Page } from "@/types/database";

function display(v: Json | null): string {
  if (v == null || v === "") return "";
  if (v === true) return "✓";
  if (v === false) return "";
  return String(v);
}

export function GalleryView({
  properties,
  rows,
  valueMap,
  onOpenRow,
  onCreateRow,
  canCreate,
}: {
  properties: DbProperty[];
  rows: Page[];
  valueMap: ValueMap;
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
                const text = display(getCellValue(row, p.id, valueMap));
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
