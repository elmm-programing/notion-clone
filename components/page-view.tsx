"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Block, PartialBlock } from "@blocknote/core";
import { usePage, useUpdatePage } from "@/lib/hooks";
import { PageHeader } from "@/components/page-header";
import { DatabaseView } from "@/components/database-view";
import { PresenceAvatars } from "@/components/presence-avatars";
import { pushRecent } from "@/lib/recents";
import {
  createCollabProvider,
  randomColor,
  type CollabProvider,
  type CollabUser,
} from "@/lib/collab";
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
  userEmail,
}: {
  pageId: string;
  workspaceId: string | null;
  userEmail?: string;
}) {
  const { data: page, isLoading } = usePage(pageId);
  const updatePage = useUpdatePage(workspaceId);

  const [title, setTitle] = useState("");
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable identity for this editing session (cursor label + color).
  const userRef = useRef<CollabUser>({
    name: userEmail?.split("@")[0] || "Guest",
    color: randomColor(),
  });

  // One collaborative provider per (document) page.
  const [collab, setCollab] = useState<CollabProvider | null>(null);
  const isDatabase = !!page?.is_database;
  useEffect(() => {
    if (!page || isDatabase) {
      setCollab(null);
      return;
    }
    const provider = createCollabProvider(page.id, userRef.current);
    setCollab(provider);
    return () => {
      provider.destroy();
      setCollab(null);
    };
  }, [page?.id, isDatabase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page) {
      setTitle(page.title ?? "");
      pushRecent(page.id);
    }
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
    <div className="pb-16">
      {!page.is_database && collab && (
        <div className="mx-auto flex max-w-3xl justify-end px-12 pt-2">
          <PresenceAvatars collab={collab} />
        </div>
      )}
      <PageHeader page={page} workspaceId={workspaceId} />
      <div className="mx-auto max-w-3xl px-12 pt-2">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full bg-transparent text-4xl font-bold outline-none placeholder:text-muted-foreground/40"
        />
      </div>

      {page.is_database ? (
        <DatabaseView dbPage={page} workspaceId={workspaceId} />
      ) : collab ? (
        <div className="mx-auto max-w-3xl px-12 pt-4">
          <Editor
            key={page.id}
            pageId={page.id}
            collab={collab}
            initialContent={
              (page.content as PartialBlock[] | null) ?? undefined
            }
            onChange={handleContentChange}
          />
        </div>
      ) : (
        <p className="mx-auto max-w-3xl px-12 pt-4 text-sm text-muted-foreground">
          Connecting…
        </p>
      )}
    </div>
  );
}
