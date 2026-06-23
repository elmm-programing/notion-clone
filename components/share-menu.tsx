"use client";

import { useState } from "react";
import { Check, Copy, Globe } from "lucide-react";
import { usePublicLink, useSetPublished } from "@/lib/hooks";

export function ShareMenu({
  pageId,
  title,
}: {
  pageId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data: link } = usePublicLink(pageId);
  const setPublished = useSetPublished(pageId);

  const published = !!link?.enabled;
  const url =
    link && typeof window !== "undefined"
      ? `${window.location.origin}/p/${link.slug}`
      : "";

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        Share
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-72 rounded-md border border-border bg-background p-3 shadow-lg">
            <div className="flex items-start gap-2">
              <Globe size={16} className="mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Publish to web</p>
                <p className="text-xs text-muted-foreground">
                  Anyone with the link can view this page.
                </p>
              </div>
              <button
                onClick={() =>
                  setPublished.mutate({ enabled: !published, title })
                }
                disabled={setPublished.isPending}
                className={`mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
                  published ? "bg-foreground" : "bg-border"
                }`}
                aria-pressed={published}
              >
                <span
                  className={`block h-4 w-4 translate-y-0.5 rounded-full bg-background transition-transform ${
                    published ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {published && url && (
              <div className="mt-3 flex items-center gap-1 rounded border border-border px-2 py-1">
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  {url}
                </span>
                <button
                  onClick={copy}
                  className="text-muted-foreground hover:text-foreground"
                  title="Copy link"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
