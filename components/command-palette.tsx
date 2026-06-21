"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, Plus, Search } from "lucide-react";
import {
  useCreatePage,
  usePages,
  useSearch,
  useUpdatePage,
} from "@/lib/hooks";
import { getRecents } from "@/lib/recents";
import type { Page } from "@/types/database";

type Item =
  | { kind: "page"; page: Page; recent?: boolean }
  | { kind: "create" };

export function CommandPalette({
  workspaceId,
  onClose,
}: {
  workspaceId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState(0);

  const { data: pages = [] } = usePages(workspaceId);
  const { data: results = [], isFetching } = useSearch(workspaceId, debounced);
  const createPage = useCreatePage(workspaceId);
  const updatePage = useUpdatePage(workspaceId);

  // Debounce the query feeding the search request.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const byId = useMemo(
    () => new Map(pages.map((p) => [p.id, p])),
    [pages],
  );

  const items: Item[] = useMemo(() => {
    const list: Item[] = [];
    if (query.trim()) {
      for (const page of results) list.push({ kind: "page", page });
    } else {
      const recents = getRecents()
        .map((id) => byId.get(id))
        .filter((p): p is Page => !!p);
      for (const page of recents) list.push({ kind: "page", page, recent: true });
    }
    list.push({ kind: "create" });
    return list;
  }, [query, results, byId]);

  // Keep the selection within bounds as the list changes.
  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, items.length - 1)));
  }, [items.length]);

  async function activate(item: Item) {
    if (item.kind === "create") {
      const title = query.trim();
      const page = await createPage.mutateAsync(null);
      if (title) updatePage.mutate({ id: page.id, patch: { title } });
      onClose();
      router.push(`/page/${page.id}`);
    } else {
      onClose();
      router.push(`/page/${item.page.id}`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[selected];
      if (item) activate(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-28"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search or create a page…"
            className="w-full bg-transparent py-3 text-sm outline-none"
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-1">
          {query.trim() &&
            query === debounced &&
            !isFetching &&
            results.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No pages match “{debounced.trim()}”.
              </p>
            )}
          {!query.trim() && items.length === 1 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No recent pages yet.
            </p>
          )}

          {items.map((item, i) => {
            const active = i === selected;
            const base =
              "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm " +
              (active ? "bg-accent" : "hover:bg-accent");
            if (item.kind === "create") {
              return (
                <button
                  key="__create"
                  className={base}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => activate(item)}
                >
                  <Plus size={14} className="text-muted-foreground" />
                  Create new page
                  {query.trim() ? ` “${query.trim()}”` : ""}
                </button>
              );
            }
            return (
              <button
                key={item.page.id}
                className={base}
                onMouseEnter={() => setSelected(i)}
                onClick={() => activate(item)}
              >
                {item.recent ? (
                  <Clock size={14} className="text-muted-foreground" />
                ) : (
                  <span className="text-muted-foreground">
                    {item.page.icon ?? <FileText size={14} />}
                  </span>
                )}
                <span className="truncate">
                  {item.page.title || "Untitled"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
