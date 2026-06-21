"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useCreatePage,
  useDeletePage,
  usePages,
} from "@/lib/hooks";
import { signOut } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Page } from "@/types/database";

export function Sidebar({
  userEmail,
  workspaceId,
  workspaceName,
}: {
  userEmail: string;
  workspaceId: string | null;
  workspaceName: string;
}) {
  const router = useRouter();
  const { data: pages = [], isLoading } = usePages(workspaceId);
  const createPage = useCreatePage(workspaceId);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Page[]>();
    for (const page of pages) {
      const key = page.parent_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(page);
    }
    return map;
  }, [pages]);

  async function handleCreateRoot() {
    const page = await createPage.mutateAsync(null);
    router.push(`/page/${page.id}`);
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sm">
      <div className="flex items-center justify-between px-3 py-3">
        <span className="truncate font-medium">{workspaceName}</span>
        <ThemeToggle />
      </div>

      <div className="px-2">
        <button
          onClick={handleCreateRoot}
          disabled={!workspaceId}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Plus size={16} />
          New page
        </button>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
        {isLoading && (
          <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>
        )}
        {!isLoading && (childrenByParent.get(null) ?? []).length === 0 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No pages yet.
          </p>
        )}
        {(childrenByParent.get(null) ?? []).map((page) => (
          <PageTreeItem
            key={page.id}
            page={page}
            depth={0}
            childrenByParent={childrenByParent}
            workspaceId={workspaceId}
          />
        ))}
      </nav>

      <div className="border-t border-border px-3 py-2">
        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        <button
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function PageTreeItem({
  page,
  depth,
  childrenByParent,
  workspaceId,
}: {
  page: Page;
  depth: number;
  childrenByParent: Map<string | null, Page[]>;
  workspaceId: string | null;
}) {
  const router = useRouter();
  const params = useParams();
  const [expanded, setExpanded] = useState(false);

  const createPage = useCreatePage(workspaceId);
  const deletePage = useDeletePage(workspaceId);

  const children = childrenByParent.get(page.id) ?? [];
  const hasChildren = children.length > 0;
  const isActive = params?.id === page.id;

  async function handleAddChild(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const child = await createPage.mutateAsync(page.id);
    setExpanded(true);
    router.push(`/page/${child.id}`);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await deletePage.mutateAsync(page.id);
    if (isActive) router.push("/");
  }

  return (
    <div>
      <Link
        href={`/page/${page.id}`}
        style={{ paddingLeft: depth * 12 + 8 }}
        className={cn(
          "group flex items-center gap-1 rounded px-2 py-1 hover:bg-accent",
          isActive && "bg-accent",
        )}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            setExpanded((v) => !v);
          }}
          className="shrink-0 text-muted-foreground"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className="inline-block w-[14px]" />
          )}
        </button>

        <span className="shrink-0 text-muted-foreground">
          {page.icon ?? <FileText size={14} />}
        </span>

        <span className="flex-1 truncate">{page.title || "Untitled"}</span>

        <button
          onClick={handleAddChild}
          className="hidden shrink-0 text-muted-foreground hover:text-foreground group-hover:block"
          title="Add subpage"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={handleDelete}
          className="hidden shrink-0 text-muted-foreground hover:text-red-500 group-hover:block"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </Link>

      {expanded &&
        children.map((child) => (
          <PageTreeItem
            key={child.id}
            page={child}
            depth={depth + 1}
            childrenByParent={childrenByParent}
            workspaceId={workspaceId}
          />
        ))}
    </div>
  );
}
