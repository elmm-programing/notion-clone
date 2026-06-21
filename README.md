# notion-clone

A Notion clone built with Next.js + Supabase + BlockNote.

## Tech stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Backend / DB:** Supabase (Postgres, Auth, Storage, Realtime, RLS)
- **Editor:** BlockNote (Tiptap / ProseMirror) — Notion-style block editor
- **Data:** TanStack Query + typed Supabase client
- **UI:** Tailwind CSS v4
- **State:** Zustand (UI), TanStack Query (server)
- **Theming:** next-themes (light/dark)

See [`PLAN.md`](./PLAN.md) for the full feature comparison against Notion and the phased roadmap.

## What's implemented (foundation)

- Email/password auth (sign up / sign in / sign out) via Supabase Auth
- Auth-guarded app via Next.js middleware
- Auto-provisioned workspace on signup (DB trigger)
- Sidebar nested page tree: create, subpages, drag-reorder, inline rename, favorites, trash
- Page header: emoji icons, cover images, breadcrumbs
- Block editor (BlockNote): slash menu, rich blocks, image/file/video upload, autosave
- Search + ⌘K quick switcher with recent pages
- Light/dark theme toggle
- Postgres schema with Row Level Security (`supabase/migrations/`)

Still to build (see `PLAN.md`): databases/table views, realtime collaboration (Yjs),
sharing/public pages, comments, embeds/callouts, export.

## Getting started

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then run each file in
`supabase/migrations/` in order in the **SQL Editor** (or `supabase db push`
with the CLI).

In **Authentication → Providers → Email**, enable email sign-ups. For local dev
you may also want to disable "Confirm email" so you can sign in immediately.

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
**Project Settings → API**.

### 3. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Sign up, then start
creating pages.

## Project structure

```
app/
  (app)/                 # auth-guarded workspace routes
    layout.tsx           # loads user + workspace, renders the app shell
    page.tsx             # workspace dashboard
    page/[id]/page.tsx   # a single page (title + block editor)
  login/page.tsx         # sign in / sign up
  layout.tsx, providers.tsx, globals.css
components/
  app-shell.tsx, sidebar.tsx, editor.tsx, page-view.tsx, theme-toggle.tsx
lib/
  supabase/{client,server,middleware}.ts
  queries.ts, hooks.ts, utils.ts
supabase/migrations/0001_init.sql
types/database.ts
middleware.ts
```
