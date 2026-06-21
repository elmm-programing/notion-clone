"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Filter as FilterIcon,
  LayoutGrid,
  Plus,
  Table as TableIcon,
  X,
} from "lucide-react";
import {
  useCreateDbProperty,
  useCreateDbRow,
  useCreateDbView,
  useDbProperties,
  useDbRows,
  useDbValues,
  useDbViews,
  useDeleteDbProperty,
  useDeleteDbView,
  useDeletePage,
  useSetDbValue,
  useUpdateDbProperty,
  useUpdateDbView,
} from "@/lib/hooks";
import { updatePage } from "@/lib/queries";
import {
  applyFilters,
  applySorts,
  TITLE_PROP,
  type DbFilter,
  type DbFilterOp,
  type ValueMap,
  type ViewConfig,
} from "@/lib/db";
import { TableView } from "@/components/table-view";
import { BoardView } from "@/components/board-view";
import type {
  DbProperty,
  DbPropertyType,
  DbView,
  Json,
  Page,
} from "@/types/database";

export function DatabaseView({
  dbPage,
  workspaceId,
}: {
  dbPage: Page;
  workspaceId: string | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: views = [] } = useDbViews(dbPage.id);
  const { data: properties = [] } = useDbProperties(dbPage.id);
  const { data: rows = [] } = useDbRows(dbPage.id);
  const rowIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const { data: values = [] } = useDbValues(dbPage.id, rowIds);

  const createView = useCreateDbView(dbPage.id);
  const updateView = useUpdateDbView(dbPage.id);
  const deleteView = useDeleteDbView(dbPage.id);
  const createProperty = useCreateDbProperty(dbPage.id);
  const updateProperty = useUpdateDbProperty(dbPage.id);
  const deleteProperty = useDeleteDbProperty(dbPage.id);
  const createRow = useCreateDbRow(dbPage.id, workspaceId);
  const deleteRow = useDeletePage(workspaceId);
  const setValue = useSetDbValue(dbPage.id);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (views.length && !views.find((v) => v.id === activeId)) {
      setActiveId(views[0].id);
    }
  }, [views, activeId]);

  const active = views.find((v) => v.id === activeId) ?? null;
  const config = (active?.config ?? {}) as ViewConfig;

  const valueMap: ValueMap = useMemo(() => {
    const map: ValueMap = new Map();
    for (const v of values) map.set(`${v.page_id}:${v.property_id}`, v.value);
    return map;
  }, [values]);

  const filtered = useMemo(
    () => applyFilters(rows, config.filters ?? [], valueMap),
    [rows, config.filters, valueMap],
  );
  const sorted = useMemo(
    () => applySorts(filtered, config.sorts ?? [], valueMap),
    [filtered, config.sorts, valueMap],
  );

  function updateConfig(patch: Partial<ViewConfig>) {
    if (!active) return;
    updateView.mutate({
      id: active.id,
      patch: {
        config: { ...config, ...patch } as unknown as DbView["config"],
      },
    });
  }

  function toggleSort(propertyId: string) {
    const cur = config.sorts?.[0];
    if (!cur || cur.propertyId !== propertyId) {
      updateConfig({ sorts: [{ propertyId, dir: "asc" }] });
    } else if (cur.dir === "asc") {
      updateConfig({ sorts: [{ propertyId, dir: "desc" }] });
    } else {
      updateConfig({ sorts: [] });
    }
  }

  function commitValue(row: Page, property: DbProperty, value: Json | null) {
    setValue.mutate({ rowId: row.id, propertyId: property.id, value });
    if (property.type === "select" && typeof value === "string" && value) {
      const options = property.config.options ?? [];
      if (!options.includes(value)) {
        updateProperty.mutate({
          id: property.id,
          patch: {
            config: { ...property.config, options: [...options, value] },
          },
        });
      }
    }
  }

  async function handleRowTitle(rowId: string, title: string) {
    await updatePage(rowId, { title });
    qc.invalidateQueries({ queryKey: ["db_rows", dbPage.id] });
    qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
  }

  function handleDeleteRow(rowId: string) {
    deleteRow.mutate(rowId, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["db_rows", dbPage.id] });
        qc.invalidateQueries({ queryKey: ["db_values", dbPage.id] });
      },
    });
  }

  async function createRowInColumn(value: string | null) {
    const row = await createRow.mutateAsync();
    const groupProp = properties.find((p) => p.id === config.groupBy);
    if (groupProp && value != null) commitValue(row, groupProp, value);
  }

  const selectProperties = properties.filter((p) => p.type === "select");
  const groupProperty =
    properties.find((p) => p.id === config.groupBy) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-12 pt-2">
      {/* View tabs */}
      <div className="mb-2 flex items-center gap-1 border-b border-border">
        {views.map((view) => (
          <ViewTab
            key={view.id}
            view={view}
            active={view.id === activeId}
            canDelete={views.length > 1}
            onSelect={() => setActiveId(view.id)}
            onRename={(name) =>
              updateView.mutate({ id: view.id, patch: { name } })
            }
            onDelete={() => {
              deleteView.mutate(view.id);
              if (activeId === view.id) setActiveId(null);
            }}
          />
        ))}
        <button
          onClick={() =>
            createView.mutate({ type: "table", name: "Table" })
          }
          className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
          title="Add table view"
        >
          <TableIcon size={14} />
        </button>
        <button
          onClick={() =>
            createView.mutate({ type: "board", name: "Board" })
          }
          className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
          title="Add board view"
        >
          <LayoutGrid size={14} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="mb-2 flex items-center gap-2 text-xs">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1 rounded px-2 py-1 hover:bg-accent ${
            (config.filters?.length ?? 0) > 0
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          <FilterIcon size={13} /> Filter
          {(config.filters?.length ?? 0) > 0
            ? ` (${config.filters!.length})`
            : ""}
        </button>
      </div>

      {showFilters && (
        <FilterBar
          properties={properties}
          filters={config.filters ?? []}
          onChange={(filters) => updateConfig({ filters })}
        />
      )}

      {active?.type === "board" ? (
        <BoardView
          groupProperty={groupProperty}
          selectProperties={selectProperties}
          rows={filtered}
          valueMap={valueMap}
          onSetGroupBy={(propertyId) => updateConfig({ groupBy: propertyId })}
          onMoveCard={(row, value) => {
            if (groupProperty) commitValue(row, groupProperty, value);
          }}
          onOpenRow={(id) => router.push(`/page/${id}`)}
          onCreateRowInColumn={createRowInColumn}
        />
      ) : (
        <TableView
          properties={properties}
          rows={sorted}
          valueMap={valueMap}
          sorts={config.sorts ?? []}
          onToggleSort={toggleSort}
          onCommitValue={commitValue}
          onRowTitle={handleRowTitle}
          onDeleteRow={handleDeleteRow}
          onOpenRow={(id) => router.push(`/page/${id}`)}
          onCreateRow={() => createRow.mutate()}
          onRenameProp={(id, name) =>
            updateProperty.mutate({ id, patch: { name } })
          }
          onRetypeProp={(id, type) =>
            updateProperty.mutate({ id, patch: { type } })
          }
          onDeleteProp={(id) => deleteProperty.mutate(id)}
          onAddProp={() =>
            createProperty.mutate({ name: "Property", type: "text" })
          }
          canCreate={!!workspaceId}
        />
      )}
    </div>
  );
}

function ViewTab({
  view,
  active,
  canDelete,
  onSelect,
  onRename,
  onDelete,
}: {
  view: DbView;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  return (
    <div
      className={`group flex items-center gap-1 border-b-2 px-2 py-1 text-sm ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground"
      }`}
    >
      {renaming ? (
        <input
          autoFocus
          defaultValue={view.name}
          onBlur={(e) => {
            onRename(e.target.value.trim() || view.name);
            setRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-24 rounded border border-border bg-background px-1 text-sm outline-none"
        />
      ) : (
        <button onClick={onSelect} onDoubleClick={() => setRenaming(true)}>
          {view.name}
        </button>
      )}
      {canDelete && (
        <button
          onClick={onDelete}
          className="hidden text-muted-foreground hover:text-red-500 group-hover:block"
          title="Delete view"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

const OPS: { value: DbFilterOp; label: string; needsValue: boolean }[] = [
  { value: "contains", label: "contains", needsValue: true },
  { value: "equals", label: "is", needsValue: true },
  { value: "empty", label: "is empty", needsValue: false },
  { value: "not_empty", label: "is not empty", needsValue: false },
  { value: "checked", label: "is checked", needsValue: false },
  { value: "unchecked", label: "is unchecked", needsValue: false },
];

function FilterBar({
  properties,
  filters,
  onChange,
}: {
  properties: DbProperty[];
  filters: DbFilter[];
  onChange: (filters: DbFilter[]) => void;
}) {
  function update(i: number, patch: Partial<DbFilter>) {
    onChange(filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function remove(i: number) {
    onChange(filters.filter((_, idx) => idx !== i));
  }
  function add() {
    const first = properties[0]?.id ?? TITLE_PROP;
    onChange([...filters, { propertyId: first, op: "contains", value: "" }]);
  }

  return (
    <div className="mb-3 space-y-2 rounded-md border border-border p-2">
      {filters.map((f, i) => {
        const op = OPS.find((o) => o.value === f.op);
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <select
              value={f.propertyId}
              onChange={(e) => update(i, { propertyId: e.target.value })}
              className="rounded border border-border bg-background px-2 py-1 outline-none"
            >
              <option value={TITLE_PROP}>Name</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={f.op}
              onChange={(e) =>
                update(i, { op: e.target.value as DbFilterOp })
              }
              className="rounded border border-border bg-background px-2 py-1 outline-none"
            >
              {OPS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {op?.needsValue && (
              <input
                value={f.value ?? ""}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="value"
                className="rounded border border-border bg-background px-2 py-1 outline-none"
              />
            )}
            <button
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-red-500"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
      <button
        onClick={add}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus size={12} /> Add filter
      </button>
    </div>
  );
}
