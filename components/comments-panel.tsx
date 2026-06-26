"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Check, MessageSquare, Trash2, X } from "lucide-react";
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useResolveComment,
} from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";

export function CommentsButton({ pageId }: { pageId: string }) {
  const [open, setOpen] = useState(false);
  const { data: comments = [] } = useComments(pageId);
  const openCount = comments.filter((c) => !c.resolved).length;

  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Live updates: peers broadcast "changed" after a comment mutation.
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`comments:${pageId}`, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "changed" }, () => {
      qc.invalidateQueries({ queryKey: ["comments", pageId] });
    }).subscribe();
    channelRef.current = ch;
    return () => {
      void supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [pageId, qc]);

  const notify = () => {
    void channelRef.current?.send({
      type: "broadcast",
      event: "changed",
      payload: {},
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Comments"
      >
        <MessageSquare size={15} />
        {openCount > 0 && <span className="text-xs">{openCount}</span>}
      </button>
      {open && (
        <CommentsPanel
          pageId={pageId}
          onClose={() => setOpen(false)}
          onChanged={notify}
        />
      )}
    </div>
  );
}

function CommentsPanel({
  pageId,
  onClose,
  onChanged,
}: {
  pageId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: comments = [], isLoading } = useComments(pageId);
  const addComment = useAddComment(pageId);
  const resolveComment = useResolveComment(pageId);
  const deleteComment = useDeleteComment(pageId);
  const [draft, setDraft] = useState("");

  function submit() {
    const body = draft.trim();
    if (!body) return;
    addComment.mutate(body, { onSuccess: onChanged });
    setDraft("");
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 z-20 mt-1 flex max-h-[28rem] w-80 flex-col rounded-md border border-border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Comments</span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && (
            <p className="px-1 py-2 text-xs text-muted-foreground">Loading…</p>
          )}
          {!isLoading && comments.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              No comments yet.
            </p>
          )}
          {comments.map((c) => (
            <div
              key={c.id}
              className={`group rounded px-2 py-1.5 ${
                c.resolved ? "opacity-50" : ""
              } hover:bg-accent`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">
                  {c.author_email ?? "User"}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() =>
                      resolveComment.mutate(
                        { id: c.id, resolved: !c.resolved },
                        { onSuccess: onChanged },
                      )
                    }
                    className="hidden text-muted-foreground hover:text-green-600 group-hover:block"
                    title={c.resolved ? "Reopen" : "Resolve"}
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() =>
                      deleteComment.mutate(c.id, { onSuccess: onChanged })
                    }
                    className="hidden text-muted-foreground hover:text-red-500 group-hover:block"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="mt-0.5 text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="Add a comment… (⌘↵ to send)"
            rows={2}
            className="w-full resize-none rounded border border-border bg-background px-2 py-1 text-sm outline-none"
          />
          <button
            onClick={submit}
            disabled={!draft.trim() || addComment.isPending}
            className="mt-1 w-full rounded bg-foreground py-1 text-xs font-medium text-background disabled:opacity-50"
          >
            Comment
          </button>
        </div>
      </div>
    </>
  );
}
