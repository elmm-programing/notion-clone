"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";

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
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        userEmail={userEmail}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        onOpenSearch={() => setPaletteOpen(true)}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>

      {paletteOpen && (
        <CommandPalette
          workspaceId={workspaceId}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  );
}
