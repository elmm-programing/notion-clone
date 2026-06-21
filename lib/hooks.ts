import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addFavorite,
  createPage,
  getPage,
  hardDeletePage,
  listFavoriteIds,
  listPages,
  listTrashed,
  movePage,
  removeFavorite,
  restorePage,
  softDeletePage,
  updatePage,
} from "@/lib/queries";
import type { Json, Page } from "@/types/database";

export function usePages(workspaceId: string | null) {
  return useQuery({
    queryKey: ["pages", workspaceId],
    queryFn: () => listPages(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function usePage(id: string) {
  return useQuery({
    queryKey: ["page", id],
    queryFn: () => getPage(id),
    enabled: !!id,
  });
}

export function useCreatePage(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parentId?: string | null) =>
      createPage({ workspaceId: workspaceId!, parentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
    },
  });
}

type PagePatch = Partial<
  Pick<Page, "title" | "icon" | "cover_url" | "position" | "parent_id">
> & {
  content?: Json;
};

export function useUpdatePage(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PagePatch }) =>
      updatePage(id, patch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
      qc.invalidateQueries({ queryKey: ["page", vars.id] });
    },
  });
}

export function useDeletePage(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeletePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
    },
  });
}

export function useMovePage(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      position,
      parentId,
    }: {
      id: string;
      position: number;
      parentId: string | null;
    }) => movePage(id, position, parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
    },
  });
}

// --- Trash ----------------------------------------------------------------

export function useTrash(workspaceId: string | null) {
  return useQuery({
    queryKey: ["trash", workspaceId],
    queryFn: () => listTrashed(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useRestorePage(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restorePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
      qc.invalidateQueries({ queryKey: ["trash", workspaceId] });
    },
  });
}

export function useHardDeletePage(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hardDeletePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trash", workspaceId] });
    },
  });
}

// --- Favorites ------------------------------------------------------------

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => listFavoriteIds(),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, on }: { pageId: string; on: boolean }) =>
      on ? addFavorite(pageId) : removeFavorite(pageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
