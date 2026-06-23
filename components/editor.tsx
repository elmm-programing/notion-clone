"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useEffect, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useTheme } from "next-themes";
import type { Block, PartialBlock } from "@blocknote/core";
import { uploadMedia } from "@/lib/queries";
import { FRAGMENT, type CollabProvider } from "@/lib/collab";

export default function Editor({
  pageId,
  initialContent,
  onChange,
  editable = true,
  collab,
}: {
  pageId: string;
  initialContent?: PartialBlock[];
  onChange?: (document: Block[]) => void;
  editable?: boolean;
  collab?: CollabProvider | null;
}) {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote(
    collab
      ? {
          // Content comes from the shared Yjs doc — don't pass initialContent.
          collaboration: {
            provider: collab,
            fragment: collab.doc.getXmlFragment(FRAGMENT),
            user: collab.user,
          },
          uploadFile: (file: File) => uploadMedia(pageId, file),
        }
      : {
          initialContent:
            initialContent && initialContent.length > 0
              ? initialContent
              : undefined,
          uploadFile: (file: File) => uploadMedia(pageId, file),
        },
  );

  // Seed a brand-new shared doc once (only the client that won the seed claim).
  useEffect(() => {
    if (!collab) return;
    let cancelled = false;
    void collab.loaded.then((shouldSeed) => {
      if (cancelled || !shouldSeed) return;
      const frag = collab.doc.getXmlFragment(FRAGMENT);
      if (frag.length === 0 && initialContent && initialContent.length > 0) {
        editor.replaceBlocks(editor.document, initialContent);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collab, editor]);

  // With collaboration, snapshot to pages.content only on LOCAL edits (remote
  // updates fire on every client and would otherwise cause write amplification).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (!collab) return;
    const handler = (_update: Uint8Array, origin: unknown) => {
      if (origin !== "remote") onChangeRef.current?.(editor.document);
    };
    collab.doc.on("update", handler);
    return () => collab.doc.off("update", handler);
  }, [collab, editor]);

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onChange={collab ? undefined : () => onChange?.(editor.document)}
    />
  );
}
