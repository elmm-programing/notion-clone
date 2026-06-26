import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addComment,
  addFavorite,
  addWorkspaceMember,
  createDatabase,
  createDbProperty,
  createDbRow,
  createDbView,
  createPage,
  deleteComment,
  deleteDbProperty,
  deleteDbView,
  duplicatePage,
  getPage,
  getPublicLink,
  hardDeletePage,
  listComments,
  listDbProperties,
  listDbRows,
  listDbValues,
  listDbViews,
  listFavoriteIds,
  listPages,
  listTrashed,
  listWorkspaceMembers,
  movePage,
  removeFavorite,
  removeWorkspaceMember,
  restorePage,
  searchPages,
  setCommentResolved,
  setDbValue,
  setPublished,
  softDeletePage,
  updateDbProperty,
  updateDbView,
  updatePage,
} from "@/lib/queries";
import type {
  DbProperty,
  DbPropertyType,
  DbView,
  Json,
  Page,
} from "@/types/database";

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

export function useDuplicatePage(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => duplicatePage(pageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
    },
  });
}

export function useCreateDatabase(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parentId?: string | null) =>
      createDatabase({ workspaceId: workspaceId!, parentId }),
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

// --- Search ---------------------------------------------------------------

export function useSearch(workspaceId: string | null, query: string) {
  return useQuery({
    queryKey: ["search", workspaceId, query],
    queryFn: () => searchPages(workspaceId!, query),
    enabled: !!workspaceId && query.trim().length > 0,
  });
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace_members", workspaceId],
    queryFn: () => listWorkspaceMembers(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useAddMember(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => addWorkspaceMember(workspaceId!, email),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["workspace_members", workspaceId] }),
  });
}

export function useRemoveMember(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      removeWorkspaceMember(workspaceId!, userId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["workspace_members", workspaceId] }),
  });
}

// --- Databases ------------------------------------------------------------

export function useDbViews(dbPageId: string) {
  return useQuery({
    queryKey: ["db_views", dbPageId],
    queryFn: () => listDbViews(dbPageId),
    enabled: !!dbPageId,
  });
}

export function useCreateDbView(dbPageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, name }: { type: DbView["type"]; name: string }) =>
      createDbView(dbPageId, type, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["db_views", dbPageId] }),
  });
}

export function useUpdateDbView(dbPageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<DbView, "name" | "type" | "config">>;
    }) => updateDbView(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["db_views", dbPageId] }),
  });
}

export function useDeleteDbView(dbPageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDbView(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["db_views", dbPageId] }),
  });
}

export function useDbProperties(dbPageId: string) {
  return useQuery({
    queryKey: ["db_properties", dbPageId],
    queryFn: () => listDbProperties(dbPageId),
    enabled: !!dbPageId,
  });
}

export function useDbRows(dbPageId: string) {
  return useQuery({
    queryKey: ["db_rows", dbPageId],
    queryFn: () => listDbRows(dbPageId),
    enabled: !!dbPageId,
  });
}

export function useDbValues(dbPageId: string, rowIds: string[]) {
  return useQuery({
    queryKey: ["db_values", dbPageId, rowIds],
    queryFn: () => listDbValues(rowIds),
    enabled: rowIds.length > 0,
  });
}

export function useCreateDbProperty(dbPageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, type }: { name: string; type: DbPropertyType }) =>
      createDbProperty(dbPageId, name, type),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["db_properties", dbPageId] }),
  });
}

export function useUpdateDbProperty(dbPageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<DbProperty, "name" | "type" | "config" | "position">>;
    }) => updateDbProperty(id, patch),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["db_properties", dbPageId] }),
  });
}

export function useDeleteDbProperty(dbPageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDbProperty(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["db_properties", dbPageId] }),
  });
}

export function useCreateDbRow(dbPageId: string, workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => createDbRow(dbPageId, workspaceId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["db_rows", dbPageId] });
      qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
    },
  });
}

export function useSetDbValue(dbPageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rowId,
      propertyId,
      value,
    }: {
      rowId: string;
      propertyId: string;
      value: Json | null;
    }) => setDbValue(rowId, propertyId, value),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["db_values", dbPageId] }),
  });
}

// --- Sharing (public links) -----------------------------------------------

export function usePublicLink(pageId: string) {
  return useQuery({
    queryKey: ["public_link", pageId],
    queryFn: () => getPublicLink(pageId),
    enabled: !!pageId,
  });
}

export function useSetPublished(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ enabled, title }: { enabled: boolean; title: string }) =>
      setPublished(pageId, enabled, title),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["public_link", pageId] }),
  });
}

// --- Comments -------------------------------------------------------------

export function useComments(pageId: string) {
  return useQuery({
    queryKey: ["comments", pageId],
    queryFn: () => listComments(pageId),
    enabled: !!pageId,
  });
}

export function useAddComment(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addComment(pageId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", pageId] }),
  });
}

export function useResolveComment(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      setCommentResolved(id, resolved),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", pageId] }),
  });
}

export function useDeleteComment(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", pageId] }),
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
