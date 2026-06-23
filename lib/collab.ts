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
  loaded: Promise<void>;
  destroy: () => void;
};

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

// A minimal Yjs provider over a Supabase Realtime channel:
// - document updates and awareness (cursors/presence) are relayed via broadcast
// - the CRDT state is loaded from / debounced-saved to `yjs_documents`
export function createCollabProvider(
  pageId: string,
  user: CollabUser,
): CollabProvider {
  const supabase = createClient();
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  awareness.setLocalStateField("user", user);

  const channel = supabase.channel(`yjs:${pageId}`, {
    config: { broadcast: { self: false } },
  });

  let destroyed = false;

  const onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote") return;
    channel.send({
      type: "broadcast",
      event: "doc",
      payload: { u: toB64(update) },
    });
  };
  doc.on("update", onDocUpdate);

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

  channel
    .on("broadcast", { event: "doc" }, ({ payload }) => {
      Y.applyUpdate(doc, fromB64(payload.u as string), "remote");
    })
    .on("broadcast", { event: "awareness" }, ({ payload }) => {
      applyAwarenessUpdate(awareness, fromB64(payload.u as string), "remote");
    })
    .on("broadcast", { event: "sync-request" }, () => {
      // A peer joined — send them our full document + awareness state.
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
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: "sync-request", payload: {} });
      }
    });

  // Debounced persistence of the CRDT state.
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const state = toB64(Y.encodeStateAsUpdate(doc));
      void supabase
        .from("yjs_documents")
        .upsert(
          { page_id: pageId, state, updated_at: new Date().toISOString() },
          { onConflict: "page_id" },
        );
    }, 1500);
  };
  doc.on("update", scheduleSave);

  const loaded = (async () => {
    const { data } = await supabase
      .from("yjs_documents")
      .select("state")
      .eq("page_id", pageId)
      .maybeSingle();
    if (!destroyed && data?.state) {
      Y.applyUpdate(doc, fromB64(data.state as string), "remote");
    }
  })();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    doc.off("update", onDocUpdate);
    doc.off("update", scheduleSave);
    awareness.off("update", onAwarenessUpdate);
    removeAwarenessStates(awareness, [doc.clientID], "local");
    void supabase.removeChannel(channel);
    if (saveTimer) clearTimeout(saveTimer);
    awareness.destroy();
    doc.destroy();
  }

  return { doc, awareness, user, loaded, destroy };
}

const COLORS = [
  "#e11d48", "#db2777", "#9333ea", "#7c3aed", "#2563eb",
  "#0891b2", "#059669", "#65a30d", "#d97706", "#dc2626",
];

export function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}
