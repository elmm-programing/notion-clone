"use client";

import { useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, MoreHorizontal, Printer } from "lucide-react";
import { useDuplicatePage } from "@/lib/hooks";
import type { MarkdownExporter } from "@/components/editor";
import type { Page } from "@/types/database";

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PageMenu({
  page,
  workspaceId,
  editorRef,
}: {
  page: Page;
  workspaceId: string | null;
  editorRef: RefObject<MarkdownExporter | null>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const duplicate = useDuplicatePage(workspaceId);

  async function handleDuplicate() {
    setOpen(false);
    const copy = await duplicate.mutateAsync(page.id);
    router.push(`/page/${copy.id}`);
  }

  async function handleExportMarkdown() {
    setOpen(false);
    const editor = editorRef.current;
    if (!editor) return;
    const md = await editor.blocksToMarkdownLossy();
    const name = `${(page.title || "untitled").replace(/[^a-z0-9]+/gi, "-")}.md`;
    download(name, `# ${page.title || "Untitled"}\n\n${md}`);
  }

  const item =
    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        title="More"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-border bg-background p-1 shadow-lg">
            {!page.is_database && (
              <button onClick={handleDuplicate} className={item}>
                <Copy size={14} /> Duplicate
              </button>
            )}
            {!page.is_database && (
              <button onClick={handleExportMarkdown} className={item}>
                <Download size={14} /> Export Markdown
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                window.print();
              }}
              className={item}
            >
              <Printer size={14} /> Print / PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
