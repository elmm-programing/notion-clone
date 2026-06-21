"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  useCreateDbProperty,
  useCreateDbRow,
  useDbProperties,
  useDbRows,
  useDbValues,
  useDeleteDbProperty,
  useDeletePage,
  useSetDbValue,
  useUpdateDbProperty,
} from "@/lib/hooks";
import { updatePage } from "@/lib/queries";
import type {
  DbProperty,
  DbPropertyType,
  Json,
  Page,
} from "@/types/database";

const TYPE_LABELS: Record<DbPropertyType, string> = {
  text: "Text",
  number: "Number",
  select: "Select",
  checkbox: "Checkbox",
  date: "Date",
  url: "URL",
};

export function DatabaseView({
  dbPage,
  workspaceId,
}: {
  dbPage: Page;
  workspaceId: string | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: properties = [] } = useDbProperties(dbPage.id);
  const { data: rows = [] } = useDbRows(dbPage.id);
  const rowIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const { data: values = [] } = useDbValues(dbPage.id, rowIds);

  const createProperty = useCreateDbProperty(dbPage.id);
  const updateProperty = useUpdateDbProperty(dbPage.id);
  const deleteProperty = useDeleteDbProperty(dbPage.id);
  const createRow = useCreateDbRow(dbPage.id, workspaceId);
  const deleteRow = useDeletePage(workspaceId);
  const setValue = useSetDbValue(dbPage.id);

  const valueMap = useMemo(() => {
    const map = new Map<string, Json | null>();
    for (const v of values) map.set(`${v.page_id}:${v.property_id}`, v.value);
    return map;
  }, [values]);

  async function handleRowTitle(rowId: string, title: string) {
    await updatePage(rowId, { title });
    qc.invalidateQueries({ queryKey: ["db_rows", dbPage.id] });
    qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
  }

  function commitValue(row: Page, property: DbProperty, value: Json | null) {
    setValue.mutate({ rowId: row.id, propertyId: property.id, value });
    // For select, remember new options on the property.
    if (property.type === "select" && typeof value === "string" && value) {
      const options = property.config.options ?? [];
      if (!options.includes(value)) {
        updateProperty.mutate({
          id: property.id,
          patch: { config: { ...property.config, options: [...options, value] } },
        });
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-12 pt-2">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-border text-left text-muted-foreground">
              <th className="min-w-48 px-2 py-1.5 font-medium">Name</th>
              {properties.map((property) => (
                <th
                  key={property.id}
                  className="min-w-40 border-l border-border px-2 py-1.5 font-medium"
                >
                  <PropertyHeader
                    property={property}
                    onRename={(name) =>
                      updateProperty.mutate({ id: property.id, patch: { name } })
                    }
                    onRetype={(type) =>
                      updateProperty.mutate({ id: property.id, patch: { type } })
                    }
                    onDelete={() => deleteProperty.mutate(property.id)}
                  />
                </th>
              ))}
              <th className="border-l border-border px-2 py-1.5">
                <button
                  onClick={() =>
                    createProperty.mutate({ name: "Property", type: "text" })
                  }
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
                      onCommit={(t) => handleRowTitle(row.id, t)}
                      className="flex-1"
                    />
                    <button
                      onClick={() => router.push(`/page/${row.id}`)}
                      className="hidden text-xs text-muted-foreground hover:text-foreground group-hover:block"
                      title="Open as page"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => deleteRow.mutate(row.id)}
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
                      value={valueMap.get(`${row.id}:${property.id}`) ?? null}
                      onCommit={(v) => commitValue(row, property, v)}
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
        onClick={() => createRow.mutate()}
        disabled={!workspaceId}
        className="mt-2 flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <Plus size={14} /> New row
      </button>
    </div>
  );
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
    <div className="relative">
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

function DbCell({
  property,
  value,
  onCommit,
}: {
  property: DbProperty;
  value: Json | null;
  onCommit: (value: Json | null) => void;
}) {
  if (property.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => onCommit(e.target.checked)}
      />
    );
  }

  if (property.type === "date") {
    return (
      <input
        type="date"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onCommit(e.target.value || null)}
        className="w-full bg-transparent text-sm outline-none"
      />
    );
  }

  if (property.type === "number") {
    return (
      <EditableText
        value={value == null ? "" : String(value)}
        placeholder="Empty"
        onCommit={(t) => onCommit(t.trim() === "" ? null : Number(t))}
      />
    );
  }

  if (property.type === "select") {
    const listId = `opts-${property.id}`;
    return (
      <>
        <EditableText
          value={typeof value === "string" ? value : ""}
          placeholder="Empty"
          listId={listId}
          onCommit={(t) => onCommit(t.trim() === "" ? null : t.trim())}
        />
        <datalist id={listId}>
          {(property.config.options ?? []).map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </>
    );
  }

  // text & url
  return (
    <EditableText
      value={typeof value === "string" ? value : ""}
      placeholder="Empty"
      onCommit={(t) => onCommit(t === "" ? null : t)}
    />
  );
}

function EditableText({
  value,
  placeholder,
  onCommit,
  className,
  listId,
}: {
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
  className?: string;
  listId?: string;
}) {
  const [draft, setDraft] = useState(value);
  // Resync when the persisted value changes externally.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  return (
    <input
      value={draft}
      list={listId}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={
        "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 " +
        (className ?? "")
      }
    />
  );
}
