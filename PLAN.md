# Notion Clone — Implementation Plan

> **Current state:** The repository contains only `README.md`. There is **no source code yet**.
> This is a greenfield build. The intended stack (per README) is **React + Supabase**.
>
> This document compares Notion's real feature set against "nothing built yet" and lays out
> a phased plan to get from zero to a credible Notion clone.

---

## 1. Target Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **React + Vite** (or Next.js) | Vite for an SPA; Next.js if SSR/SEO for public pages matters. |
| Language | **TypeScript** | Strongly recommended for the block/data model. |
| Backend / DB | **Supabase** (Postgres + Auth + Storage + Realtime) | Auth, row-level security, file uploads, realtime sync. |
| Editor | **Tiptap** (ProseMirror) or a custom block editor | Tiptap gives a big head start on rich text + blocks. |
| State / data | **TanStack Query** + Zustand/Context | Server cache + local UI state. |
| Styling | **Tailwind CSS** + Radix UI / shadcn | Fast, accessible primitives for menus, modals, popovers. |
| Drag & drop | **dnd-kit** | Block reordering, board columns, sidebar reorder. |
| Routing | React Router (Vite) or App Router (Next) | |

---

## 2. Notion Feature Inventory vs. This Repo

Legend: ❌ Not started (everything is, today) · 🟡 Partial · ✅ Done

### Core editing
| Feature | Status |
| --- | --- |
| Rich text (bold, italic, underline, strike, code, color, link) | ❌ |
| Block-based editor (paragraph, headings H1–H3) | ❌ |
| Slash (`/`) command menu to insert blocks | ❌ |
| Lists: bulleted, numbered, to-do (checkbox), toggle | ❌ |
| Quote, callout, divider, code block (syntax highlight) | ❌ |
| Drag-to-reorder blocks; nested blocks / indentation | ❌ |
| Block actions menu (duplicate, delete, turn into, color) | ❌ |
| Markdown shortcuts (`#`, `-`, `>`, ` ``` `) | ❌ |
| Images, video, files, bookmarks, embeds | ❌ |
| Tables (simple) and columns layout | ❌ |
| Math/LaTeX equations | ❌ |

### Pages & structure
| Feature | Status |
| --- | --- |
| Nested pages (page-in-page hierarchy) | ❌ |
| Sidebar tree with expand/collapse, drag reorder | ❌ |
| Page icon (emoji) + cover image | ❌ |
| Breadcrumbs | ❌ |
| Favorites / pinned pages | ❌ |
| Trash / soft delete + restore | ❌ |
| Quick search / quick switcher (Cmd-K) | ❌ |
| Page templates | ❌ |

### Databases (Notion's biggest feature)
| Feature | Status |
| --- | --- |
| Database concept (collection of pages w/ properties) | ❌ |
| Property types: text, number, select, multi-select, date, checkbox, URL, etc. | ❌ |
| Views: Table, Board (Kanban), List, Calendar, Gallery, Timeline | ❌ |
| Filter, sort, group | ❌ |
| Relations & rollups | ❌ |
| Formulas | ❌ |

### Collaboration & accounts
| Feature | Status |
| --- | --- |
| Auth (sign up / login) | ❌ |
| Workspaces & membership | ❌ |
| Realtime multiplayer editing + presence | ❌ |
| Sharing / permissions (view/edit, public links) | ❌ |
| Comments & mentions | ❌ |
| Version history | ❌ |

### Polish
| Feature | Status |
| --- | --- |
| Dark mode | ❌ |
| Keyboard shortcuts | ❌ |
| Mobile responsive | ❌ |
| Offline / optimistic updates | ❌ |
| Export (Markdown/PDF) | ❌ |

**Summary: 0% built.** The plan below sequences this into shippable milestones.

---

## 3. Data Model (Supabase / Postgres)

Notion is fundamentally a tree of **blocks**. Pages are just blocks. Recommended schema:

```sql
-- Workspaces & membership
workspaces        (id, name, icon, created_at, owner_id)
workspace_members (workspace_id, user_id, role)              -- owner/admin/member/guest

-- Pages (a page is a block with type='page', but a pages table simplifies navigation)
pages (
  id uuid pk,
  workspace_id uuid,
  parent_id uuid null,          -- nested pages (self-reference)
  title text,
  icon text,                    -- emoji or url
  cover_url text,
  is_database boolean default false,
  created_by uuid, created_at, updated_at,
  deleted_at timestamptz null   -- soft delete (trash)
)

-- Blocks (the document content tree)
blocks (
  id uuid pk,
  page_id uuid,
  parent_block_id uuid null,    -- nesting (toggles, columns, list items)
  type text,                    -- paragraph|heading|todo|bulleted|image|code|...
  content jsonb,                -- rich text spans + type-specific props
  position numeric,             -- fractional indexing for cheap reorder
  created_at, updated_at
)

-- Databases
db_properties (id, page_id, name, type, config jsonb, position)
db_rows       -- each row IS a page; values stored as:
db_values     (page_id, property_id, value jsonb)
db_views      (id, page_id, type, name, config jsonb)   -- filters/sorts/groups

-- Collaboration
comments  (id, block_id|page_id, author_id, body, resolved, created_at)
favorites (user_id, page_id)
```

Key decisions:
- **Fractional indexing** (`position` as fraction/string) for O(1) reorders without renumbering.
- **Row-Level Security (RLS)** on every table keyed off workspace membership — non-negotiable with Supabase.
- Store rich text as a **spans array** in `content` jsonb (text + marks), Tiptap-compatible.

---

## 4. Phased Roadmap

### Phase 0 — Project foundation (1–2 days)
- Scaffold Vite + React + TS + Tailwind; ESLint/Prettier.
- Supabase project: env vars, client, generated types.
- App shell: sidebar + main panel layout, routing, dark mode toggle.

### Phase 1 — Auth & workspaces (2–3 days)
- Supabase Auth (email/password + OAuth optional).
- Create default workspace on signup; protected routes.
- RLS policies for workspaces/members.

### Phase 2 — Pages & sidebar (3–4 days)
- CRUD pages; nested page tree in sidebar (expand/collapse).
- Page header: editable title, emoji icon picker, cover image.
- Breadcrumbs; soft-delete to Trash + restore.

### Phase 3 — Block editor (core) (1–2 weeks) ← the heart of the app
- Integrate **Tiptap** (or build a block list with contentEditable).
- Block types: paragraph, H1–H3, bulleted/numbered/to-do lists, quote, divider, code.
- Slash `/` menu + Markdown input shortcuts.
- Block hover handle: drag-reorder (dnd-kit), block actions menu, "turn into".
- Persist blocks to Supabase with debounced/optimistic saves.

### Phase 4 — Rich media & advanced blocks (1 week)
- Image/file upload via Supabase Storage; bookmarks/embeds.
- Toggle (collapsible), callout, nested blocks/indentation.
- Code block syntax highlighting; simple tables; columns layout.

### Phase 5 — Search & navigation (3–4 days)
- Cmd-K quick switcher; full-text search (Postgres `tsvector`).
- Favorites/pinned pages; recent pages.

### Phase 6 — Databases (2–3 weeks) ← second-biggest effort
- Database pages + property schema editor.
- **Table view** first (the foundation), then **Board (Kanban)** and **Gallery**.
- Filter / sort / group; then Calendar/List views.
- (Stretch) relations, rollups, formulas.

### Phase 7 — Collaboration (1–2 weeks)
- Realtime sync via Supabase Realtime (broadcast/postgres changes) + presence cursors.
- Comments & @mentions; sharing/permissions, public read-only links.
- (Stretch) version history.

### Phase 8 — Polish (ongoing)
- Keyboard shortcuts, mobile responsiveness, export (Markdown/PDF),
  templates, offline/optimistic refinements, performance (virtualized lists).

---

## 5. Suggested MVP

To get something demoable fast, target **Phases 0–3**:
*Auth → workspace → nested pages in a sidebar → a working block editor with slash
commands and drag-reorder, persisted to Supabase.*

That alone reads as "a Notion clone." Databases (Phase 6) and realtime collab (Phase 7)
are what make it *compelling* — schedule them next.

---

## 6. Biggest Risks / Hard Parts
1. **The block editor** — reordering, nesting, selection, and slash menu are deceptively
   complex. Using Tiptap/ProseMirror saves weeks vs. rolling your own contentEditable.
2. **Databases** — the property/view/filter system is a mini app of its own.
3. **Realtime collaboration** — conflict resolution; consider Yjs (CRDT) if true
   concurrent editing is required, otherwise last-write-wins per block is much simpler.
4. **RLS correctness** — get Supabase policies right early; retrofitting security is painful.
</content>
</invoke>
