"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { uploadMedia } from "@/lib/queries";
import type {
  DbFile,
  DbProperty,
  Json,
  Page,
  WorkspaceMemberInfo,
} from "@/types/database";

function fmtDate(v: unknown): string {
  if (typeof v !== "string" || !v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export function DbCell({
  property,
  value,
  row,
  members,
  pagesById,
  onCommit,
}: {
  property: DbProperty;
  value: Json | null;
  row: Page;
  members: WorkspaceMemberInfo[];
  pagesById: Map<string, Page>;
  onCommit: (value: Json | null) => void;
}) {
  switch (property.type) {
    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onCommit(e.target.checked)}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onCommit(e.target.value || null)}
          className="w-full bg-transparent text-sm outline-none"
        />
      );

    case "created_time":
      return (
        <span className="text-sm text-muted-foreground">
          {fmtDate(row.created_at)}
        </span>
      );

    case "edited_time":
      return (
        <span className="text-sm text-muted-foreground">
          {fmtDate(row.updated_at)}
        </span>
      );

    case "number":
      return (
        <EditableText
          value={value == null ? "" : String(value)}
          placeholder="Empty"
          onCommit={(t) => {
            const n = Number(t);
            onCommit(t.trim() === "" || Number.isNaN(n) ? null : n);
          }}
        />
      );

    case "select": {
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

    case "multi_select":
      return (
        <MultiSelectCell property={property} value={value} onCommit={onCommit} />
      );

    case "person": {
      const v = typeof value === "string" ? value : "";
      return (
        <select
          value={v}
          onChange={(e) => onCommit(e.target.value || null)}
          className="w-full bg-transparent text-sm outline-none"
        >
          <option value="">—</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.email ?? m.user_id.slice(0, 8)}
            </option>
          ))}
        </select>
      );
    }

    case "files":
      return <FilesCell row={row} value={value} onCommit={onCommit} />;

    case "relation": {
      const targetDb = property.config.relationDbId;
      const ids = Array.isArray(value) ? (value as string[]) : [];
      const candidates = targetDb
        ? [...pagesById.values()].filter(
            (p) => p.parent_id === targetDb && !p.deleted_at,
          )
        : [];
      return (
        <RelationCell
          ids={ids}
          candidates={candidates}
          pagesById={pagesById}
          hasTarget={!!targetDb}
          onCommit={onCommit}
        />
      );
    }

    default:
      // text & url
      return (
        <EditableText
          value={typeof value === "string" ? value : ""}
          placeholder="Empty"
          onCommit={(t) => onCommit(t === "" ? null : t)}
        />
      );
  }
}

function MultiSelectCell({
  property,
  value,
  onCommit,
}: {
  property: DbProperty;
  value: Json | null;
  onCommit: (value: Json | null) => void;
}) {
  const arr = Array.isArray(value) ? (value as string[]) : [];
  const [draft, setDraft] = useState("");
  const listId = `opts-${property.id}`;

  function add(tag: string) {
    const t = tag.trim();
    if (!t || arr.includes(t)) return;
    onCommit([...arr, t]);
    setDraft("");
  }
  function remove(tag: string) {
    onCommit(arr.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {arr.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-xs"
        >
          {tag}
          <button onClick={() => remove(tag)} className="hover:text-red-500">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        list={listId}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => add(draft)}
        placeholder="+"
        className="w-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
      />
      <datalist id={listId}>
        {(property.config.options ?? []).map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}

function FilesCell({
  row,
  value,
  onCommit,
}: {
  row: Page;
  value: Json | null;
  onCommit: (value: Json | null) => void;
}) {
  const files = Array.isArray(value) ? (value as DbFile[]) : [];
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const url = await uploadMedia(row.id, f);
      onCommit([...files, { name: f.name, url }]);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {files.map((f, i) => (
        <span key={i} className="flex items-center gap-1 rounded bg-accent px-1.5 py-0.5">
          <a href={f.url} target="_blank" rel="noreferrer" className="underline">
            {f.name}
          </a>
          <button
            onClick={() => onCommit(files.filter((_, idx) => idx !== i))}
            className="hover:text-red-500"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <label className="cursor-pointer text-muted-foreground hover:text-foreground">
        {busy ? "…" : "+"}
        <input type="file" className="hidden" onChange={onPick} />
      </label>
    </div>
  );
}

function RelationCell({
  ids,
  candidates,
  pagesById,
  hasTarget,
  onCommit,
}: {
  ids: string[];
  candidates: Page[];
  pagesById: Map<string, Page>;
  hasTarget: boolean;
  onCommit: (value: Json | null) => void;
}) {
  if (!hasTarget) {
    return <span className="text-xs text-muted-foreground/60">Set target db</span>;
  }
  const available = candidates.filter((c) => !ids.includes(c.id));
  return (
    <div className="flex flex-wrap items-center gap-1">
      {ids.map((id) => (
        <span
          key={id}
          className="flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-xs"
        >
          {pagesById.get(id)?.title || "Untitled"}
          <button
            onClick={() => onCommit(ids.filter((x) => x !== id))}
            className="hover:text-red-500"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <select
        value=""
        onChange={(e) => e.target.value && onCommit([...ids, e.target.value])}
        className="bg-transparent text-xs text-muted-foreground outline-none"
      >
        <option value="">+ link</option>
        {available.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title || "Untitled"}
          </option>
        ))}
      </select>
    </div>
  );
}

export function EditableText({
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
