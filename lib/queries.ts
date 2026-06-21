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
  patch: Partial<Pick<Page, "title" | "icon" | "cover_url" | "content">> & {
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

export async function signOut() {
  await db().auth.signOut();
}
