"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useTheme } from "next-themes";
import type { Block, PartialBlock } from "@blocknote/core";

export default function Editor({
  initialContent,
  onChange,
  editable = true,
}: {
  initialContent?: PartialBlock[];
  onChange?: (document: Block[]) => void;
  editable?: boolean;
}) {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote({
    initialContent:
      initialContent && initialContent.length > 0 ? initialContent : undefined,
  });

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onChange={() => onChange?.(editor.document)}
    />
  );
}
