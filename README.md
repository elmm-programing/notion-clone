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
- Realtime multiplayer editing (Yjs + Supabase Realtime): live cursors & presence avatars
- Light/dark theme toggle
- Postgres schema with Row Level Security (`supabase/migrations/`)

Still to build (see `PLAN.md`): sharing/public pages, comments & mentions,
templates, export, and the database stretch goals (relations/rollups/formulas).

## Run everything in Docker (self-hosted Supabase + app)

The fastest way to run the whole thing locally — no Supabase account needed.
`docker compose` brings up Postgres, Auth (GoTrue), REST (PostgREST), Storage,
the Kong API gateway, Studio, and the Next.js app, and auto-applies the SQL
migrations.

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

| Service | URL |
| --- | --- |
| App | http://localhost:3000 |
| Supabase API gateway (Kong) | http://localhost:8000 |
| Postgres | localhost:5432 |

Studio (the DB admin UI) is optional and heavier — start it with its profile:

```bash
docker compose --env-file .env.docker --profile studio up -d
# Studio → http://localhost:3001
```

Sign up at http://localhost:3000 (email auto-confirm is on, so no SMTP needed).

> Needs a few GB of free Docker disk for the images. If the `db` container
> reports `No space left on device` / stays unhealthy, reclaim space with
> `docker system prune -a --volumes` (and raise the disk size in Docker Desktop
> → Resources if applicable), then `up` again.
Tear down with `docker compose --env-file .env.docker down` (add `-v` to also
wipe the database/storage volumes).

> The `.env.docker.example` values are the standard Supabase **demo** secrets —
> fine for localhost, but change `POSTGRES_PASSWORD`, `JWT_SECRET`, and the
> `ANON_KEY`/`SERVICE_ROLE_KEY` (regenerate the keys for your secret) before
> exposing this anywhere. Migrations re-run only on a fresh DB volume; to
> re-apply after changes, `down -v` first or run them manually.

## Getting started (Supabase Cloud + local Node)

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
