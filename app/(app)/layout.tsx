import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import type { Workspace } from "@/types/database";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // RLS ensures this only returns a workspace the user belongs to.
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .limit(1)
    .single();
  const workspace = data as Workspace | null;

  return (
    <AppShell
      userEmail={user.email ?? ""}
      workspaceId={workspace?.id ?? null}
      workspaceName={workspace?.name ?? "Workspace"}
    >
      {children}
    </AppShell>
  );
}
