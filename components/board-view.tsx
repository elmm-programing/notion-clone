"use client";

import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { boardColumns, getCellValue, type ValueMap } from "@/lib/db";
import type { DbProperty, Json, Page } from "@/types/database";

const NONE = "__none__";

export function BoardView({
  groupProperty,
  selectProperties,
  rows,
  valueMap,
  onSetGroupBy,
  onMoveCard,
  onOpenRow,
  onCreateRowInColumn,
}: {
  groupProperty: DbProperty | null;
  selectProperties: DbProperty[];
  rows: Page[];
  valueMap: ValueMap;
  onSetGroupBy: (propertyId: string | null) => void;
  onMoveCard: (row: Page, value: Json | null) => void;
  onOpenRow: (rowId: string) => void;
  onCreateRowInColumn: (value: string | null) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const rowById = useMemo(
    () => new Map(rows.map((r) => [r.id, r])),
    [rows],
  );

  if (!groupProperty) {
    return (
      <div className="text-sm text-muted-foreground">
        {selectProperties.length === 0 ? (
          <p>Add a “select” property to group this board.</p>
        ) : (
          <label className="flex items-center gap-2">
            Group by
            <select
              defaultValue=""
              onChange={(e) => onSetGroupBy(e.target.value || null)}
              className="rounded border border-border bg-background px-2 py-1 text-sm outline-none"
            >
              <option value="" disabled>
                Choose a property…
              </option>
              {selectProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    );
  }

  const columns = boardColumns(groupProperty, rows, valueMap);

  function rowsFor(option: string | null): Page[] {
    return rows.filter((row) => {
      const v = getCellValue(row, groupProperty!.id, valueMap);
      if (option === null) return v == null || v === "";
      return v === option;
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const row = rowById.get(String(e.active.id));
    if (!row) return;
    const colKey = String(e.over.id).replace(/^col:/, "");
    onMoveCard(row, colKey === NONE ? null : colKey);
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Group by</span>
        <select
          value={groupProperty.id}
          onChange={(e) => onSetGroupBy(e.target.value || null)}
          className="rounded border border-border bg-background px-2 py-1 outline-none"
        >
          {selectProperties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex items-start gap-3 overflow-x-auto pb-4">
          {[...columns, NONE].map((col) => (
            <Column
              key={col}
              colKey={col}
              label={col === NONE ? "No value" : col}
              rows={rowsFor(col === NONE ? null : col)}
              onOpenRow={onOpenRow}
              onAdd={() => onCreateRowInColumn(col === NONE ? null : col)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({
  colKey,
  label,
  rows,
  onOpenRow,
  onAdd,
}: {
  colKey: string;
  label: string;
  rows: Page[];
  onOpenRow: (rowId: string) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${colKey}` });
  return (
    <div
      ref={setNodeRef}
      className={`w-64 shrink-0 rounded-md bg-muted/50 p-2 ${
        isOver ? "ring-2 ring-foreground/20" : ""
      }`}
    >
      <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
        {label} · {rows.length}
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <Card key={row.id} row={row} onOpen={() => onOpenRow(row.id)} />
        ))}
      </div>
      <button
        onClick={onAdd}
        className="mt-2 flex w-full items-center gap-1 rounded px-1 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus size={12} /> New
      </button>
    </div>
  );
}

function Card({ row, onOpen }: { row: Page; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: row.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, opacity: isDragging ? 0.5 : 1 }}
      className="rounded border border-border bg-background p-2 text-sm shadow-sm"
    >
      <div className="flex items-start justify-between gap-1">
        <span
          {...attributes}
          {...listeners}
          className="flex-1 cursor-grab truncate"
        >
          {row.title || "Untitled"}
        </span>
        <button
          onClick={onOpen}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          Open
        </button>
      </div>
    </div>
  );
}
