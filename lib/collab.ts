"use client";

import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import { createClient } from "@/lib/supabase/client";

export type CollabUser = { name: string; color: string };

// Yjs binds to this fragment; must match across clients and the editor.
export const FRAGMENT = "document-store";

export type CollabProvider = {
  doc: Y.Doc;
  awareness: Awareness;
  user: CollabUser;
  // Resolves to whether THIS client won the right to seed a brand-new doc.
  loaded: Promise<boolean>;
  // Subscribe to the live list of *other* online collaborators (presence).
  subscribePresence: (cb: (users: CollabUser[]) => void) => () => void;
  destroy: () => void;
};

const HEARTBEAT_MS = 15_000;
const AWARENESS_TIMEOUT_MS = 30_000;

function toB64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

// A Yjs provider over a Supabase Realtime channel:
// - document + awareness (cursors) updates relayed via broadcast
// - the avatar list uses Supabase Presence (reliable join/leave, incl. crashes)
// - CRDT state loaded from / debounced-saved to `yjs_documents`
export function createCollabProvider(
  pageId: string,
  user: CollabUser,
): CollabProvider {
  const supabase = createClient();
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  awareness.setLocalStateField("user", user);

  const channel = supabase.channel(`yjs:${pageId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: String(doc.clientID) },
    },
  });

  let destroyed = false;
  let liveness: ReturnType<typeof setInterval> | null = null;

  // --- document sync ---
  const onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote") return;
    channel.send({ type: "broadcast", event: "doc", payload: { u: toB64(update) } });
  };
  doc.on("update", onDocUpdate);

  // --- awareness (cursors) sync ---
  const onAwarenessUpdate = (
    {
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === "remote") return;
    const changed = [...added, ...updated, ...removed];
    channel.send({
      type: "broadcast",
      event: "awareness",
      payload: { u: toB64(encodeAwarenessUpdate(awareness, changed)) },
    });
  };
  awareness.on("update", onAwarenessUpdate);

  // --- presence (avatar list) ---
  const presenceListeners = new Set<(users: CollabUser[]) => void>();
  let currentUsers: CollabUser[] = [];
  const emitPresence = () => {
    const state = channel.presenceState<{ user: CollabUser }>();
    const users: CollabUser[] = [];
    for (const [key, metas] of Object.entries(state)) {
      if (key === String(doc.clientID)) continue; // exclude self
      for (const m of metas) if (m.user) users.push(m.user);
    }
    currentUsers = users;
    presenceListeners.forEach((cb) => cb(users));
  };

  // --- persistence (only the editing client writes) ---
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const onPersist = (_update: Uint8Array, origin: unknown) => {
    if (origin === "remote") return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const stateStr = toB64(Y.encodeStateAsUpdate(doc));
      void supabase
        .from("yjs_documents")
        .upsert(
          { page_id: pageId, state: stateStr, updated_at: new Date().toISOString() },
          { onConflict: "page_id" },
        );
    }, 1500);
  };
  doc.on("update", onPersist);

  function startLiveness() {
    if (liveness) return;
    liveness = setInterval(() => {
      // Heartbeat: refresh our awareness so peers don't prune us.
      const local = awareness.getLocalState();
      if (local) awareness.setLocalState(local);
      // Prune collaborators we haven't heard from (closed tab / dropped).
      const now = Date.now();
      const stale: number[] = [];
      awareness.meta.forEach((meta, clientID) => {
        if (clientID !== doc.clientID && now - meta.lastUpdated > AWARENESS_TIMEOUT_MS) {
          stale.push(clientID);
        }
      });
      if (stale.length) removeAwarenessStates(awareness, stale, "prune");
    }, HEARTBEAT_MS);
  }

  channel
    .on("broadcast", { event: "doc" }, ({ payload }) => {
      Y.applyUpdate(doc, fromB64(payload.u as string), "remote");
    })
    .on("broadcast", { event: "awareness" }, ({ payload }) => {
      applyAwarenessUpdate(awareness, fromB64(payload.u as string), "remote");
    })
    .on("broadcast", { event: "sync-request" }, () => {
      // A peer joined — send our full document + awareness state.
      channel.send({
        type: "broadcast",
        event: "doc",
        payload: { u: toB64(Y.encodeStateAsUpdate(doc)) },
      });
      channel.send({
        type: "broadcast",
        event: "awareness",
        payload: {
          u: toB64(
            encodeAwarenessUpdate(awareness, [...awareness.getStates().keys()]),
          ),
        },
      });
    })
    .on("presence", { event: "sync" }, emitPresence)
    .on("presence", { event: "join" }, emitPresence)
    .on("presence", { event: "leave" }, emitPresence)
    .subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      void channel.track({ user });
      channel.send({ type: "broadcast", event: "sync-request", payload: {} });
      // Announce our own cursor to peers already present.
      channel.send({
        type: "broadcast",
        event: "awareness",
        payload: { u: toB64(encodeAwarenessUpdate(awareness, [doc.clientID])) },
      });
      startLiveness();
    });

  // Load persisted state; if none exists, atomically claim the right to seed.
  const loaded: Promise<boolean> = (async () => {
    const { data } = await supabase
      .from("yjs_documents")
      .select("state")
      .eq("page_id", pageId)
      .maybeSingle();
    if (destroyed) return false;
    if (data?.state) {
      Y.applyUpdate(doc, fromB64(data.state as string), "remote");
      return false;
    }
    if (data) return false; // row exists (claimed) but no state yet
    const { error } = await supabase
      .from("yjs_documents")
      .insert({ page_id: pageId, state: "" });
    return !error && !destroyed; // inserted => we own the seed
  })();

  function subscribePresence(cb: (users: CollabUser[]) => void) {
    presenceListeners.add(cb);
    cb(currentUsers);
    return () => {
      presenceListeners.delete(cb);
    };
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (liveness) clearInterval(liveness);
    if (saveTimer) clearTimeout(saveTimer);
    // Best-effort "I left" while the handler + channel are still live.
    removeAwarenessStates(awareness, [doc.clientID], "local");
    doc.off("update", onDocUpdate);
    doc.off("update", onPersist);
    awareness.off("update", onAwarenessUpdate);
    presenceListeners.clear();
    void channel.untrack();
    void supabase.removeChannel(channel);
    awareness.destroy();
    doc.destroy();
  }

  return { doc, awareness, user, loaded, subscribePresence, destroy };
}

const COLORS = [
  "#e11d48", "#db2777", "#9333ea", "#7c3aed", "#2563eb",
  "#0891b2", "#059669", "#65a30d", "#d97706", "#dc2626",
];

export function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}
