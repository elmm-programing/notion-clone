"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useEffect } from "react";
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

  // Seed a brand-new shared doc once from the page's saved snapshot.
  useEffect(() => {
    if (!collab) return;
    let cancelled = false;
    void collab.loaded.then(() => {
      if (cancelled) return;
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

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onChange={() => onChange?.(editor.document)}
    />
  );
}
