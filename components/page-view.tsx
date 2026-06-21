"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Block, PartialBlock } from "@blocknote/core";
import { usePage, useUpdatePage } from "@/lib/hooks";
import type { Json } from "@/types/database";

const Editor = dynamic(() => import("@/components/editor"), {
  ssr: false,
  loading: () => (
    <p className="px-1 py-2 text-sm text-muted-foreground">Loading editor…</p>
  ),
});

export function PageView({
  pageId,
  workspaceId,
}: {
  pageId: string;
  workspaceId: string | null;
}) {
  const { data: page, isLoading } = usePage(pageId);
  const updatePage = useUpdatePage(workspaceId);

  const [title, setTitle] = useState("");
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (page) setTitle(page.title ?? "");
  }, [page?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTitleChange(value: string) {
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      updatePage.mutate({ id: pageId, patch: { title: value || "Untitled" } });
    }, 500);
  }

  function handleContentChange(document: Block[]) {
    if (contentTimer.current) clearTimeout(contentTimer.current);
    contentTimer.current = setTimeout(() => {
      updatePage.mutate({
        id: pageId,
        patch: { content: document as unknown as Json },
      });
    }, 800);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-12 py-16 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-12 py-16 text-muted-foreground">
        Page not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-12 py-16">
      <input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Untitled"
        className="mb-4 w-full bg-transparent text-4xl font-bold outline-none placeholder:text-muted-foreground/40"
      />
      <Editor
        key={page.id}
        initialContent={(page.content as PartialBlock[] | null) ?? undefined}
        onChange={handleContentChange}
      />
    </div>
  );
}
