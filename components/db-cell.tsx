"use client";

import { useState } from "react";
import type { DbProperty, Json } from "@/types/database";

export function DbCell({
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
        onCommit={(t) => {
          const n = Number(t);
          onCommit(t.trim() === "" || Number.isNaN(n) ? null : n);
        }}
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
