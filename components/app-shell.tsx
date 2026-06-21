"use client";

import { Sidebar } from "@/components/sidebar";

export function AppShell({
  children,
  userEmail,
  workspaceId,
  workspaceName,
}: {
  children: React.ReactNode;
  userEmail: string;
  workspaceId: string | null;
  workspaceName: string;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        userEmail={userEmail}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
