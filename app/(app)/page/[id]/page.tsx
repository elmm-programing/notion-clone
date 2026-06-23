import { createClient } from "@/lib/supabase/server";
import { PageView } from "@/components/page-view";
import type { Workspace } from "@/types/database";

export default async function PageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { data: auth }] = await Promise.all([
    supabase.from("workspaces").select("id").limit(1).single(),
    supabase.auth.getUser(),
  ]);
  const workspace = data as Pick<Workspace, "id"> | null;

  return (
    <PageView
      pageId={id}
      workspaceId={workspace?.id ?? null}
      userEmail={auth.user?.email ?? undefined}
    />
  );
}
