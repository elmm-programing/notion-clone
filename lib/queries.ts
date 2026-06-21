import { createClient } from "@/lib/supabase/client";
import type { Json, Page } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Lazy singleton so the client is only constructed in the browser, never at
// module-import / prerender time (where env vars may be unavailable).
let _client: SupabaseClient<Database> | null = null;
function db() {
  if (!_client) _client = createClient();
  return _client;
}

export async function listPages(workspaceId: string): Promise<Page[]> {
  const { data, error } = await db()
    .from("pages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("position", { ascending: true });

  if (error) throw error;
  return data as Page[];
}

export async function getPage(id: string): Promise<Page | null> {
  const { data, error } = await db()
    .from("pages")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data as Page | null;
}

export async function createPage(input: {
  workspaceId: string;
  parentId?: string | null;
  title?: string;
}): Promise<Page> {
  const { data, error } = await db()
    .from("pages")
    .insert({
      workspace_id: input.workspaceId,
      parent_id: input.parentId ?? null,
      title: input.title ?? "Untitled",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Page;
}

export async function updatePage(
  id: string,
  patch: Partial<
    Pick<
      Page,
      "title" | "icon" | "cover_url" | "content" | "position" | "parent_id"
    >
  > & {
    content?: Json;
  },
): Promise<void> {
  const { error } = await db()
    .from("pages")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function softDeletePage(id: string): Promise<void> {
  const { error } = await db()
    .from("pages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

// --- Trash ----------------------------------------------------------------

export async function listTrashed(workspaceId: string): Promise<Page[]> {
  const { data, error } = await db()
    .from("pages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) throw error;
  return data as Page[];
}

export async function restorePage(id: string): Promise<void> {
  const { error } = await db()
    .from("pages")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) throw error;
}

export async function hardDeletePage(id: string): Promise<void> {
  const { error } = await db().from("pages").delete().eq("id", id);
  if (error) throw error;
}

// --- Reordering / re-parenting --------------------------------------------

export async function movePage(
  id: string,
  position: number,
  parentId: string | null,
): Promise<void> {
  const { error } = await db()
    .from("pages")
    .update({ position, parent_id: parentId })
    .eq("id", id);

  if (error) throw error;
}

// --- Favorites ------------------------------------------------------------

export async function listFavoriteIds(): Promise<string[]> {
  const { data, error } = await db().from("favorites").select("page_id");
  if (error) throw error;
  return (data as { page_id: string }[]).map((r) => r.page_id);
}

export async function addFavorite(pageId: string): Promise<void> {
  const {
    data: { user },
  } = await db().auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await db()
    .from("favorites")
    .insert({ user_id: user.id, page_id: pageId });
  if (error) throw error;
}

export async function removeFavorite(pageId: string): Promise<void> {
  const { error } = await db()
    .from("favorites")
    .delete()
    .eq("page_id", pageId);
  if (error) throw error;
}

// --- Cover image upload ----------------------------------------------------

export async function uploadCover(
  pageId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${pageId}/${Date.now()}.${ext}`;
  const { error } = await db()
    .storage.from("covers")
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = db().storage.from("covers").getPublicUrl(path);
  return data.publicUrl;
}

export async function signOut() {
  await db().auth.signOut();
}
