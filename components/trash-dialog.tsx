"use client";

import { RotateCcw, Trash2, X } from "lucide-react";
import { useHardDeletePage, useRestorePage, useTrash } from "@/lib/hooks";

export function TrashDialog({
  workspaceId,
  onClose,
}: {
  workspaceId: string | null;
  onClose: () => void;
}) {
  const { data: trashed = [], isLoading } = useTrash(workspaceId);
  const restore = useRestorePage(workspaceId);
  const hardDelete = useHardDeletePage(workspaceId);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="w-full max-w-md rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Trash</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {isLoading && (
            <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>
          )}
          {!isLoading && trashed.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Trash is empty.
            </p>
          )}
          {trashed.map((page) => (
            <div
              key={page.id}
              className="group flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span className="flex-1 truncate">
                {page.icon ? `${page.icon} ` : ""}
                {page.title || "Untitled"}
              </span>
              <button
                onClick={() => restore.mutate(page.id)}
                className="text-muted-foreground hover:text-foreground"
                title="Restore"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => {
                  if (confirm("Permanently delete this page and its subpages?"))
                    hardDelete.mutate(page.id);
                }}
                className="text-muted-foreground hover:text-red-500"
                title="Delete forever"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
