"use client";

import dynamic from "next/dynamic";
import type { PartialBlock } from "@blocknote/core";
import type { Page } from "@/types/database";

const Editor = dynamic(() => import("@/components/editor"), { ssr: false });

export function PublicPage({ page }: { page: Page }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {page.cover_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={page.cover_url}
          alt="cover"
          className="h-52 w-full object-cover"
        />
      )}
      <article className="mx-auto max-w-3xl px-12 py-10">
        {page.icon && (
          <div className={`text-6xl ${page.cover_url ? "-mt-16" : ""}`}>
            {page.icon}
          </div>
        )}
        <h1 className="mt-2 mb-4 text-4xl font-bold">
          {page.title || "Untitled"}
        </h1>
        <Editor
          pageId={page.id}
          editable={false}
          initialContent={(page.content as PartialBlock[] | null) ?? undefined}
        />
      </article>
      <footer className="mx-auto max-w-3xl px-12 pb-10 text-xs text-muted-foreground">
        Published with Notion Clone
      </footer>
    </div>
  );
}
