import { createClient } from "@/lib/supabase/client";
import type {
  DbProperty,
  DbPropertyType,
  DbValue,
  Json,
  Page,
} from "@/types/database";
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
  // Cascade to the whole subtree so subpages are never orphaned.
  const { error } = await db().rpc("soft_delete_page", { p_id: id });
  if (error) throw error;
}

// --- Search ---------------------------------------------------------------

export async function searchPages(
  workspaceId: string,
  query: string,
): Promise<Page[]> {
  const q = query.trim();
  if (!q) return [];
  // Escape LIKE metacharacters so they match literally.
  const escaped = q.replace(/[\\%_]/g, "\\$&");
  const { data, error } = await db()
    .from("pages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .ilike("title", `%${escaped}%`)
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) throw error;
  return data as Page[];
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
  const trashed = data as Page[];

  // Show only "trash roots" — a page whose parent isn't itself trashed — so a
  // cascaded subtree appears as a single restorable entry, not one row per node.
  const trashedIds = new Set(trashed.map((p) => p.id));
  return trashed.filter(
    (p) => !p.parent_id || !trashedIds.has(p.parent_id),
  );
}

export async function restorePage(id: string): Promise<void> {
  const { error } = await db().rpc("restore_page", { p_id: id });
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
  // upsert + ignoreDuplicates so a rapid double-toggle can't hit the PK.
  const { error } = await db()
    .from("favorites")
    .upsert(
      { user_id: user.id, page_id: pageId },
      { onConflict: "user_id,page_id", ignoreDuplicates: true },
    );
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

// Remove every object stored under "<pageId>/" so covers don't leak when
// replaced or removed.
async function clearCoverFiles(pageId: string): Promise<void> {
  const { data: files } = await db().storage.from("covers").list(pageId);
  if (files && files.length > 0) {
    await db()
      .storage.from("covers")
      .remove(files.map((f) => `${pageId}/${f.name}`));
  }
}

export async function uploadCover(
  pageId: string,
  file: File,
): Promise<string> {
  await clearCoverFiles(pageId);

  const rawExt = file.name.includes(".")
    ? file.name.split(".").pop()!
    : "jpg";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${pageId}/${Date.now()}.${ext}`;

  const { error } = await db()
    .storage.from("covers")
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = db().storage.from("covers").getPublicUrl(path);
  return data.publicUrl;
}

export async function removeCover(pageId: string): Promise<void> {
  await clearCoverFiles(pageId);
}

// --- In-page media upload (images, files, video) for the editor ------------

export async function uploadMedia(
  pageId: string,
  file: File,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${pageId}/${Date.now()}-${safeName}`;
  const { error } = await db()
    .storage.from("media")
    .upload(path, file, { upsert: false });
  if (error) throw error;

  const { data } = db().storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

// --- Databases ------------------------------------------------------------

export async function createDatabase(input: {
  workspaceId: string;
  parentId?: string | null;
}): Promise<Page> {
  const { data, error } = await db()
    .from("pages")
    .insert({
      workspace_id: input.workspaceId,
      parent_id: input.parentId ?? null,
      title: "Untitled database",
      is_database: true,
    })
    .select("*")
    .single();
  if (error) throw error;

  const page = data as Page;
  // Seed a default view and a first select property so the table isn't empty.
  await db().from("db_views").insert({ page_id: page.id, type: "table" });
  await db()
    .from("db_properties")
    .insert({ page_id: page.id, name: "Status", type: "select" });
  return page;
}

export async function listDbProperties(
  dbPageId: string,
): Promise<DbProperty[]> {
  const { data, error } = await db()
    .from("db_properties")
    .select("*")
    .eq("page_id", dbPageId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data as DbProperty[];
}

export async function createDbProperty(
  dbPageId: string,
  name: string,
  type: DbPropertyType,
): Promise<void> {
  const { error } = await db()
    .from("db_properties")
    .insert({ page_id: dbPageId, name, type });
  if (error) throw error;
}

export async function updateDbProperty(
  id: string,
  patch: Partial<Pick<DbProperty, "name" | "type" | "config" | "position">>,
): Promise<void> {
  const { error } = await db().from("db_properties").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteDbProperty(id: string): Promise<void> {
  const { error } = await db().from("db_properties").delete().eq("id", id);
  if (error) throw error;
}

export async function listDbRows(dbPageId: string): Promise<Page[]> {
  const { data, error } = await db()
    .from("pages")
    .select("*")
    .eq("parent_id", dbPageId)
    .is("deleted_at", null)
    .order("position", { ascending: true });
  if (error) throw error;
  return data as Page[];
}

export async function listDbValues(rowIds: string[]): Promise<DbValue[]> {
  if (rowIds.length === 0) return [];
  const { data, error } = await db()
    .from("db_values")
    .select("*")
    .in("page_id", rowIds);
  if (error) throw error;
  return data as DbValue[];
}

export async function setDbValue(
  rowId: string,
  propertyId: string,
  value: Json | null,
): Promise<void> {
  const { error } = await db()
    .from("db_values")
    .upsert(
      { page_id: rowId, property_id: propertyId, value },
      { onConflict: "page_id,property_id" },
    );
  if (error) throw error;
}

export async function createDbRow(
  dbPageId: string,
  workspaceId: string,
): Promise<Page> {
  const { data, error } = await db()
    .from("pages")
    .insert({
      workspace_id: workspaceId,
      parent_id: dbPageId,
      title: "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Page;
}

export async function signOut() {
  await db().auth.signOut();
}
