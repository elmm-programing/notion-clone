"use client";

import { useEffect, useState } from "react";
import type { CollabProvider, CollabUser } from "@/lib/collab";

export function PresenceAvatars({ collab }: { collab: CollabProvider }) {
  const [users, setUsers] = useState<CollabUser[]>([]);

  useEffect(() => collab.subscribePresence(setUsers), [collab]);

  if (users.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1.5">
      {users.slice(0, 6).map((u, i) => (
        <span
          key={i}
          title={u.name}
          style={{ backgroundColor: u.color }}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-medium text-white"
        >
          {u.name.slice(0, 1).toUpperCase()}
        </span>
      ))}
      {users.length > 6 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] text-muted-foreground">
          +{users.length - 6}
        </span>
      )}
    </div>
  );
}
