"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile sidebar whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        // Don't steal Cmd/Ctrl+K from text editing (BlockNote uses it to add a
        // link) or from form fields.
        const t = e.target as HTMLElement | null;
        if (
          t &&
          (t.isContentEditable ||
            t.closest("[contenteditable='true']") ||
            t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA")
        ) {
          return;
        }
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: static on desktop, slide-over on mobile */}
      <div
        className={`no-print fixed inset-y-0 left-0 z-40 w-60 transform transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          userEmail={userEmail}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          onOpenSearch={() => setPaletteOpen(true)}
        />
      </div>

      <main className="relative flex-1 overflow-y-auto">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="no-print fixed top-3 left-3 z-40 rounded bg-background/80 p-1.5 text-muted-foreground backdrop-blur hover:bg-accent md:hidden"
          title="Open sidebar"
        >
          <Menu size={18} />
        </button>
        {children}
      </main>

      {paletteOpen && (
        <CommandPalette
          workspaceId={workspaceId}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  );
}
