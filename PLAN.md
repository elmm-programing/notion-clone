# Notion Clone — Complete Build Plan

> **Goal:** build a full Notion clone — pages, a block editor, databases with
> multiple views, realtime collaboration, sharing, and search.
>
> **Stack (locked):** Next.js 16 (App Router) · React 19 · TypeScript ·
> Supabase (Postgres + Auth + Storage + Realtime + RLS) · BlockNote (Tiptap/
> ProseMirror) · Yjs (CRDT) · TanStack Query · Tailwind v4 · next-themes ·
> dnd-kit · Zustand.
>
> **Status today:** the foundation (Phases 0–3) is largely built and the app
> compiles. This document tracks what's done and details every remaining phase
> through to a complete clone.

Legend: ✅ done · 🟡 partial · ⬜ not started

---

## 1. Where we are

| Capability | Status |
| --- | --- |
| Next.js + TS + Tailwind v4 scaffold, dark mode | ✅ |
| Supabase clients (browser/server/middleware) + auth guard | ✅ |
| Email/password auth (sign up / in / out) | ✅ |
| Postgres schema + RLS + signup trigger (workspaces, members, pages) | ✅ |
| Sidebar nested page tree (create / subpage / delete) | ✅ |
| BlockNote editor: title + blocks + debounced autosave | ✅ |
| Page icons (emoji) / cover images (Storage) | ✅ |
| Breadcrumbs, trash UI, favorites | ✅ |
| Sidebar drag-reorder (same level) + inline rename | ✅ |
| Search + Cmd-K quick switcher + recents | ✅ |
| Databases: properties, Table + Board views, filter/sort | ✅ |
| Gallery/List/Calendar views, grouping in table, relations | ⬜ |
| Realtime collaboration (Yjs) + presence | ⬜ |
| Comments, mentions, sharing / public pages | ⬜ |
| Media uploads (image/file/video) + rich block set | ✅ |
| Embeds/bookmarks, callout, columns, code highlight | ⬜ |
| Export, templates, mobile polish | ⬜ |

---

## 2. Data model

Current tables (`supabase/migrations/0001_init.sql`): `profiles`, `workspaces`,
`workspace_members`, `pages` (with `content jsonb` holding the BlockNote
document), plus the `is_workspace_member()` RLS helper and the
`handle_new_user()` signup trigger.

Tables to add as we go (each in its own numbered migration):

```sql
-- Favorites / pinned pages
favorites (user_id, page_id, created_at, primary key (user_id, page_id))

-- Database feature -------------------------------------------------------
-- A "database" is a page with is_database = true. Its rows are also pages
-- (parent_id = the database page). Schema + values + views live here:
db_properties (id, page_id /*the db*/, name, type, config jsonb, position)
db_values     (page_id /*the row*/, property_id, value jsonb,
               primary key (page_id, property_id))
db_views      (id, page_id /*the db*/, type, name, config jsonb, position)
--   type: table | board | gallery | list | calendar
--   config: { filters[], sorts[], groupBy, visibleProps[], ... }

-- Collaboration ----------------------------------------------------------
comments     (id, page_id, block_id, author_id, body, resolved, created_at)
page_shares  (page_id, principal /*user or 'public'*/, role, created_at)
public_links (page_id, slug unique, enabled, created_at)
yjs_documents(page_id, state bytea, updated_at)   -- Yjs CRDT snapshot

-- History (optional) -----------------------------------------------------
page_snapshots (id, page_id, content jsonb, created_by, created_at)
```

Design rules (carry forward):
- **RLS on every table**, keyed off `is_workspace_member()` (SECURITY DEFINER to
  avoid recursion); public read paths gated by `public_links.enabled`.
- **Fractional `position`** for cheap reordering (pages, properties, views, rows).
- Regenerate `types/database.ts` after each migration. Rows must be `type`
  aliases (not `interface`) or supabase-js infers `never`.

---

## 3. Roadmap to a complete clone

### Phase 4 — Page polish & navigation ✅ (done)
- ✅ Emoji **icon picker** + **cover image** (Supabase Storage) on page header.
- ✅ **Breadcrumbs** from the page ancestry.
- ✅ **Trash**: list soft-deleted pages, restore, permanent delete.
- ✅ **Favorites**: pin pages to a sidebar section (`favorites` table).
- 🟡 Sidebar **drag-to-reorder** (dnd-kit + fractional `position`) — same-level
  reordering works; cross-level **re-parenting via drag** is a follow-up.
- ✅ Inline title editing in the sidebar (double-click); "Untitled" placeholders.

### Phase 5 — Search & quick switcher ✅ (done)
- ✅ Title search (`ILIKE`, trigram-indexed). *(Content-text / ranked `tsvector`
  search deferred until block text extraction lands in Phase 6.)*
- ✅ **Cmd-K** quick switcher: search, recent pages, "create page" (uses the
  typed text as the title), full keyboard navigation.
- ✅ Recent-pages tracking (localStorage).

#### Phase 4 follow-up fixes (done in migration 0003)
- ✅ Soft delete / restore now **cascade** the whole subtree (no orphaned pages);
  Trash shows only top-level deleted entries.
- ✅ Cover objects are **deleted from Storage** on replace/remove (no leak).
- ✅ Cover bucket writes **scoped to the owning page's workspace** members.
- ✅ Favorite toggle uses **upsert** (no PK error on rapid clicks); sign-out
  **clears the query cache**.

### Phase 6 — Rich blocks & media 🟡 (core done)
- ✅ Image / file / video / audio upload via Supabase Storage (`media` bucket +
  BlockNote `uploadFile` handler; path-scoped RLS).
- ✅ Default block set wired: headings, bulleted/numbered/check (to-do) lists,
  toggle lists, quote, code block, divider, tables — all via BlockNote.
- ✅ **Slash menu** + Markdown input shortcuts (BlockNote built-in).
- ✅ Block actions: drag handle, duplicate, turn-into, color (BlockNote side menu).
- ⬜ Bookmarks & link previews; embeds (YouTube, etc.) — custom blocks, follow-up.
- ⬜ Callout & multi-column layout — need custom block / `xl-multi-column`.
- ⬜ Code-block **syntax highlighting** (Shiki) — follow-up.

### Phase 7 — Databases (largest phase) 🟡 (Table + Board, filter/sort) ⭐
Building incrementally; Table view shipped first.
- ✅ Create a database page (sidebar "New database"); **property schema editor**
  (add, rename, change type, delete) via the column header menu.
- ✅ Property types: text, number, select, checkbox, date, URL.
  *(multi-select, person, files, created/edited time still ⬜)*
- ✅ **Table view**: inline-editable cells per type, add/delete rows (rows are
  child pages), open a row as a full page. Select remembers its options.
- ✅ **Filter / sort** — persisted per view (filter bar + click-to-sort columns).
- ✅ **Board (Kanban)** view: group by a select property, drag cards between
  columns (dnd-kit) to set the value, add cards per column.
- ✅ Multiple saved views per database + **view switcher** (table/board, add,
  rename, delete).
- ⬜ Table **grouping**, column show-hide & resize.
- ⬜ **Gallery**, **List**, **Calendar** views.
- ⬜ *(Stretch)* relations, rollups, formulas.

### Phase 8 — Realtime collaboration
- ⬜ Integrate **Yjs** with BlockNote (`@blocknote/core` collaboration option).
- ⬜ Sync provider: Supabase Realtime broadcast (or y-sweet / PartyKit / a
  Hocuspocus server for scale); persist Yjs state to `yjs_documents`.
- ⬜ **Presence**: live cursors + avatars of active editors.
- ⬜ Conflict-free multi-client editing; offline catch-up on reconnect.

### Phase 9 — Sharing, permissions & comments
- ⬜ Per-page **sharing** (invite workspace members; view/comment/edit roles).
- ⬜ **Public links**: read-only published pages (SSR route, no auth) via
  `public_links` + relaxed RLS.
- ⬜ **Comments** on blocks/pages; resolve threads.
- ⬜ **@mentions** of people and pages; basic notifications.
- ⬜ Workspace **member management** & invites.

### Phase 10 — Productivity & polish
- ⬜ **Templates** (page + database templates; "duplicate as template").
- ⬜ **Export**: Markdown and PDF; import from Markdown.
- ⬜ *(Optional)* **Version history** via `page_snapshots`.
- ⬜ Full **keyboard shortcuts**; command palette actions.
- ⬜ **Mobile-responsive** layout; collapsible sidebar.
- ⬜ Performance: virtualized long pages/tables, optimistic updates everywhere.
- ⬜ Accessibility pass; empty states; error/loading boundaries.

---

## 4. Suggested order & milestones

1. **M1 — "A polished notebook"**: Phases 4 + 5. Pages feel complete; you can
   navigate, search, and organize. *(small)*
2. **M2 — "Rich content"**: Phase 6. Real Notion-like editing with media. *(medium)*
3. **M3 — "Databases"**: Phase 7. The defining Notion feature. *(large)*
4. **M4 — "Multiplayer"**: Phases 8 + 9. Realtime + sharing make it compelling. *(large)*
5. **M5 — "Production polish"**: Phase 10. *(ongoing)*

---

## 5. Hard parts / risks
1. **Databases** (Phase 7) — properties + views + filter/sort/group is a mini
   app; model views as serialized config and compute results with SQL +
   client-side refinement. Start with Table, generalize from there.
2. **Realtime** (Phase 8) — CRDT wiring and a durable sync/persistence layer;
   Supabase Realtime works for moderate scale, a dedicated Yjs server for more.
3. **RLS for sharing/public pages** (Phase 9) — get policies right; public read
   must not leak private siblings. Test policies explicitly.
4. **Editor ↔ DB shape** — keep BlockNote document JSON the source of truth for
   page bodies; derive plain text for search separately.

---

## 6. Working agreement
- Each phase = its own migration(s) + typed queries/hooks + UI, kept building
  green (`npm run build`) before commit.
- Push to `claude/sharp-allen-ftbfwr`; commits update **PR #1**.
- Regenerate `types/database.ts` whenever the schema changes.
</content>
