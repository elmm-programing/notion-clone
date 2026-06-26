"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Star,
  Trash,
  Trash2,
} from "lucide-react";
import {
  useCreateDatabase,
  useCreatePage,
  useDeletePage,
  useFavorites,
  useMovePage,
  usePages,
  useUpdatePage,
} from "@/lib/hooks";
import { signOut } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrashDialog } from "@/components/trash-dialog";
import type { Page } from "@/types/database";

export function Sidebar({
  userEmail,
  workspaceId,
  workspaceName,
  onOpenSearch,
}: {
  userEmail: string;
  workspaceId: string | null;
  workspaceName: string;
  onOpenSearch: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: pages = [], isLoading } = usePages(workspaceId);
  const { data: favoriteIds = [] } = useFavorites();
  const createPage = useCreatePage(workspaceId);
  const createDatabase = useCreateDatabase(workspaceId);
  const movePage = useMovePage(workspaceId);

  const [trashOpen, setTrashOpen] = useState(false);

  const byId = useMemo(
    () => new Map(pages.map((p) => [p.id, p])),
    [pages],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Page[]>();
    for (const page of pages) {
      const key = page.parent_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(page);
    }
    return map;
  }, [pages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Is `nodeId` inside the subtree rooted at `rootId` (prevents cycles)?
  function isInSubtree(rootId: string, nodeId: string | null): boolean {
    let cur = nodeId;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      if (cur === rootId) return true;
      seen.add(cur);
      cur = byId.get(cur)?.parent_id ?? null;
    }
    return false;
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = byId.get(String(active.id));
    const o = byId.get(String(over.id));
    if (!a || !o) return;

    // Drop into the target's sibling group at the target's position — this
    // both reorders (same parent) and re-parents (different parent).
    const targetParent = o.parent_id;
    if (a.id === targetParent || isInSubtree(a.id, targetParent)) return; // no cycles

    const siblings = (childrenByParent.get(targetParent) ?? []).filter(
      (p) => p.id !== a.id,
    );
    const overIndex = siblings.findIndex((p) => p.id === o.id);
    if (overIndex < 0) return;

    const prev = siblings[overIndex - 1]?.position;
    const next = siblings[overIndex]?.position; // the target, now after `a`
    let position: number;
    if (prev == null && next == null) position = Date.now();
    else if (prev == null) position = next! - 1;
    else if (next == null) position = prev + 1;
    else position = (prev + next) / 2;

    movePage.mutate({ id: a.id, position, parentId: targetParent });
  }

  async function handleCreateRoot() {
    const page = await createPage.mutateAsync(null);
    router.push(`/page/${page.id}`);
  }

  async function handleCreateDatabase() {
    const page = await createDatabase.mutateAsync(null);
    router.push(`/page/${page.id}`);
  }

  const rootPages = childrenByParent.get(null) ?? [];
  const favorites = favoriteIds
    .map((id) => byId.get(id))
    .filter((p): p is Page => !!p);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sm">
      <div className="flex items-center justify-between px-3 py-3">
        <span className="truncate font-medium">{workspaceName}</span>
        <ThemeToggle />
      </div>

      <div className="px-2">
        <button
          onClick={onOpenSearch}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Search size={16} />
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border border-border px-1 text-[10px]">
            ⌘K
          </kbd>
        </button>
        <button
          onClick={handleCreateRoot}
          disabled={!workspaceId}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Plus size={16} />
          New page
        </button>
        <button
          onClick={handleCreateDatabase}
          disabled={!workspaceId}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Database size={16} />
          New database
        </button>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
        {favorites.length > 0 && (
          <div className="mb-3">
            <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Favorites
            </p>
            {favorites.map((page) => (
              <Link
                key={page.id}
                href={`/page/${page.id}`}
                className="flex items-center gap-1 rounded px-2 py-1 hover:bg-accent"
              >
                <Star size={13} className="fill-yellow-400 text-yellow-400" />
                <span className="truncate">
                  {page.icon ? `${page.icon} ` : ""}
                  {page.title || "Untitled"}
                </span>
              </Link>
            ))}
          </div>
        )}

        <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Private
        </p>

        {isLoading && (
          <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>
        )}
        {!isLoading && rootPages.length === 0 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No pages yet.
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <PageLevel
            parentId={null}
            depth={0}
            childrenByParent={childrenByParent}
            workspaceId={workspaceId}
          />
        </DndContext>
      </nav>

      <div className="border-t border-border px-3 py-2">
        <button
          onClick={() => setTrashOpen(true)}
          className="mb-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Trash size={14} /> Trash
        </button>
        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        <button
          onClick={async () => {
            await signOut();
            qc.clear(); // drop cached user-scoped data (favorites, pages, …)
            router.push("/login");
            router.refresh();
          }}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>

      {trashOpen && (
        <TrashDialog
          workspaceId={workspaceId}
          onClose={() => setTrashOpen(false)}
        />
      )}
    </aside>
  );
}

function PageLevel({
  parentId,
  depth,
  childrenByParent,
  workspaceId,
}: {
  parentId: string | null;
  depth: number;
  childrenByParent: Map<string | null, Page[]>;
  workspaceId: string | null;
}) {
  const items = childrenByParent.get(parentId) ?? [];
  return (
    <SortableContext
      items={items.map((p) => p.id)}
      strategy={verticalListSortingStrategy}
    >
      {items.map((page) => (
        <PageTreeItem
          key={page.id}
          page={page}
          depth={depth}
          childrenByParent={childrenByParent}
          workspaceId={workspaceId}
        />
      ))}
    </SortableContext>
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
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(page.title);

  const createPage = useCreatePage(workspaceId);
  const deletePage = useDeletePage(workspaceId);
  const updatePage = useUpdatePage(workspaceId);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });

  // Database rows are child pages; don't surface them in the sidebar tree.
  const children = childrenByParent.get(page.id) ?? [];
  const hasChildren = !page.is_database && children.length > 0;
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

  function commitRename() {
    setRenaming(false);
    const next = draftTitle.trim();
    if (next !== page.title) {
      updatePage.mutate({ id: page.id, patch: { title: next || "Untitled" } });
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Link
        href={`/page/${page.id}`}
        style={{ paddingLeft: depth * 12 + 4 }}
        className={cn(
          "group flex items-center gap-1 rounded px-2 py-1 hover:bg-accent",
          isActive && "bg-accent",
        )}
      >
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.preventDefault()}
          className="hidden shrink-0 cursor-grab text-muted-foreground group-hover:block"
          title="Drag to reorder"
        >
          <GripVertical size={12} />
        </button>

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
          {page.icon ??
            (page.is_database ? (
              <Database size={14} />
            ) : (
              <FileText size={14} />
            ))}
        </span>

        {renaming ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onClick={(e) => e.preventDefault()}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraftTitle(page.title);
                setRenaming(false);
              }
            }}
            className="flex-1 rounded border border-border bg-background px-1 text-sm outline-none"
          />
        ) : (
          <span className="flex-1 truncate">{page.title || "Untitled"}</span>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDraftTitle(page.title);
            setRenaming(true);
          }}
          className="hidden shrink-0 text-muted-foreground hover:text-foreground group-hover:block"
          title="Rename"
        >
          <Pencil size={13} />
        </button>
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
          title="Move to trash"
        >
          <Trash2 size={14} />
        </button>
      </Link>

      {expanded && hasChildren && (
        <PageLevel
          parentId={page.id}
          depth={depth + 1}
          childrenByParent={childrenByParent}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
