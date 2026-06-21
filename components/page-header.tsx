"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Smile, Star } from "lucide-react";
import {
  useFavorites,
  usePages,
  useToggleFavorite,
  useUpdatePage,
} from "@/lib/hooks";
import { removeCover, uploadCover } from "@/lib/queries";
import { EmojiPicker } from "@/components/emoji-picker";
import type { Page } from "@/types/database";

function useAncestry(page: Page, workspaceId: string | null): Page[] {
  const { data: pages = [] } = usePages(workspaceId);
  const byId = new Map(pages.map((p) => [p.id, p]));
  const chain: Page[] = [];
  let current: Page | undefined = byId.get(page.id) ?? page;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return chain;
}

export function PageHeader({
  page,
  workspaceId,
}: {
  page: Page;
  workspaceId: string | null;
}) {
  const updatePage = useUpdatePage(workspaceId);
  const { data: favoriteIds = [] } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const ancestry = useAncestry(page, workspaceId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isFavorite = favoriteIds.includes(page.id);

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCover(page.id, file);
      updatePage.mutate({ id: page.id, patch: { cover_url: url } });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 px-12 pt-3 text-xs text-muted-foreground">
        {ancestry.map((p, i) => (
          <span key={p.id} className="flex items-center gap-1">
            {i > 0 && <span>/</span>}
            {i < ancestry.length - 1 ? (
              <Link href={`/page/${p.id}`} className="hover:text-foreground">
                {p.icon ? `${p.icon} ` : ""}
                {p.title || "Untitled"}
              </Link>
            ) : (
              <span className="text-foreground">
                {p.icon ? `${p.icon} ` : ""}
                {p.title || "Untitled"}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Cover */}
      {page.cover_url && (
        <div className="group relative mt-2 h-48 w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.cover_url}
            alt="cover"
            className="h-full w-full object-cover"
          />
          <div className="absolute right-3 bottom-3 hidden gap-2 group-hover:flex">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded bg-background/80 px-2 py-1 text-xs hover:bg-background"
            >
              Change
            </button>
            <button
              onClick={async () => {
                // Clear the reference regardless; object cleanup is best-effort.
                try {
                  await removeCover(page.id);
                } catch {
                  // ignore storage errors — the cover_url is what matters
                }
                updatePage.mutate({ id: page.id, patch: { cover_url: null } });
              }}
              className="rounded bg-background/80 px-2 py-1 text-xs hover:bg-background"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-3xl px-12">
        {/* Big icon */}
        {page.icon && (
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className={`text-6xl leading-none hover:opacity-80 ${
              page.cover_url ? "-mt-10" : "mt-6"
            }`}
          >
            {page.icon}
          </button>
        )}

        {/* Add icon / cover controls */}
        <div className="mt-2 flex h-6 items-center gap-3 text-xs text-muted-foreground">
          {!page.icon && (
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Smile size={14} /> Add icon
            </button>
          )}
          {!page.cover_url && (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ImagePlus size={14} /> {uploading ? "Uploading…" : "Add cover"}
            </button>
          )}
          <button
            onClick={() =>
              toggleFavorite.mutate({ pageId: page.id, on: !isFavorite })
            }
            className="flex items-center gap-1 hover:text-foreground"
          >
            <Star
              size={14}
              className={isFavorite ? "fill-yellow-400 text-yellow-400" : ""}
            />
            {isFavorite ? "Favorited" : "Favorite"}
          </button>
        </div>

        {pickerOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setPickerOpen(false)}
            />
            <div className="absolute z-20 mt-1">
              <EmojiPicker
                onSelect={(emoji) => {
                  updatePage.mutate({ id: page.id, patch: { icon: emoji } });
                  setPickerOpen(false);
                }}
                onRemove={
                  page.icon
                    ? () => {
                        updatePage.mutate({
                          id: page.id,
                          patch: { icon: null },
                        });
                        setPickerOpen(false);
                      }
                    : undefined
                }
              />
            </div>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverFile}
      />
    </div>
  );
}
