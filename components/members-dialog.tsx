"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import {
  useAddMember,
  useRemoveMember,
  useWorkspaceMembers,
} from "@/lib/hooks";

export function MembersDialog({
  workspaceId,
  onClose,
}: {
  workspaceId: string | null;
  onClose: () => void;
}) {
  const { data: members = [], isLoading } = useWorkspaceMembers(workspaceId);
  const addMember = useAddMember(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function invite() {
    const e = email.trim();
    if (!e) return;
    setError(null);
    addMember.mutate(e, {
      onSuccess: () => setEmail(""),
      onError: (err) => setError((err as Error).message),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Workspace members</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && invite()}
              placeholder="Invite by email…"
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"
            />
            <button
              onClick={invite}
              disabled={!email.trim() || addMember.isPending}
              className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
            >
              Invite
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            The person must already have an account.
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto border-t border-border p-2">
          {isLoading && (
            <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>
          )}
          {members.map((m) => (
            <div
              key={m.user_id}
              className="group flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span className="flex-1 truncate">
                {m.email ?? m.user_id.slice(0, 8)}
              </span>
              <span className="text-xs text-muted-foreground">{m.role}</span>
              {m.role !== "owner" && (
                <button
                  onClick={() => removeMember.mutate(m.user_id)}
                  className="hidden text-muted-foreground hover:text-red-500 group-hover:block"
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
