"use client";

import { useMemo, useState } from "react";

// A small, dependency-free emoji picker. Each entry is [emoji, keywords].
const EMOJIS: [string, string][] = [
  ["📄", "page document file note"],
  ["📝", "memo note write edit"],
  ["📒", "ledger notebook"],
  ["📓", "notebook"],
  ["📚", "books library"],
  ["📦", "package box"],
  ["📁", "folder"],
  ["🗂️", "dividers organize"],
  ["✅", "check done task todo"],
  ["⭐", "star favorite"],
  ["🔥", "fire hot trending"],
  ["💡", "idea bulb light"],
  ["🎯", "target goal"],
  ["🚀", "rocket launch ship"],
  ["🏠", "home house"],
  ["📅", "calendar date"],
  ["📊", "chart bar data stats"],
  ["📈", "chart growth up"],
  ["💼", "work briefcase business"],
  ["🧠", "brain mind think"],
  ["🛠️", "tools build"],
  ["⚙️", "settings gear config"],
  ["🔧", "wrench fix"],
  ["🐛", "bug issue"],
  ["💻", "laptop code dev"],
  ["📌", "pin pinned"],
  ["🔖", "bookmark"],
  ["🏷️", "label tag"],
  ["❤️", "heart love"],
  ["🎉", "party celebrate"],
  ["☕", "coffee break"],
  ["🌱", "plant grow seed"],
  ["🌍", "world earth global"],
  ["🎨", "art design palette"],
  ["🎵", "music note"],
  ["📷", "camera photo"],
  ["💰", "money cash finance"],
  ["🍔", "food burger"],
  ["✈️", "travel plane trip"],
  ["⏰", "clock time alarm"],
  ["🔑", "key access"],
  ["📍", "location pin map"],
  ["🧩", "puzzle piece"],
  ["🏆", "trophy win award"],
];

export function EmojiPicker({
  onSelect,
  onRemove,
}: {
  onSelect: (emoji: string) => void;
  onRemove?: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJIS;
    return EMOJIS.filter(([, kw]) => kw.includes(q));
  }, [query]);

  return (
    <div className="w-64 rounded-md border border-border bg-background p-2 shadow-lg">
      <div className="mb-2 flex items-center gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs outline-none"
        />
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Remove
          </button>
        )}
      </div>
      <div className="grid max-h-48 grid-cols-7 gap-1 overflow-y-auto">
        {filtered.map(([emoji]) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="rounded p-1 text-lg hover:bg-accent"
          >
            {emoji}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-7 px-1 py-2 text-xs text-muted-foreground">
            No matches.
          </p>
        )}
      </div>
    </div>
  );
}
