import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createPage,
  getPage,
  listPages,
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

export function useUpdatePage(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Page, "title" | "icon" | "cover_url">> & {
        content?: Json;
      };
    }) => updatePage(id, patch),
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
