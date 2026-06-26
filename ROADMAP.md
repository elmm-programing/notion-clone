# Roadmap to Feature-Complete Notion

> Phases 0–10 (the core build) are done — see `PLAN.md`. This document is the
> **remaining work** to take the clone from "core feature parity" to a credible,
> full Notion replacement. Items are grouped into prioritized milestones (M6→M13),
> each with an effort tag (**S** ≤1d · **M** 2–4d · **L** ≥1w) and the key
> tables/components/libraries involved.
>
> Suggested order is top-to-bottom; within a milestone, items are independent
> unless a dependency is noted.

Legend: ⬜ not started · 🟡 partial

---

## M6 — Finish the near-done gaps (quick wins) ✅ (done)

Small, self-contained items deferred during Phases 4–8. Best ROI.

| Item | Effort | Notes |
| --- | --- | --- |
| ✅ Collaborative **page title** | S | Title bound to a shared `Y.Text` in the page doc; syncs live, snapshots to `pages.title`. |
| ✅ **Realtime comments** | S | Per-page Supabase broadcast channel; peers invalidate `["comments", pageId]` after each mutation (badge + panel update live). |
| ✅ Sidebar **drag re-parenting** | M | Dropping into another item's sibling group reorders *and* re-parents (sets `parent_id` + fractional `position`); cycle-guarded. |
| ✅ Property types: **multi-select, person, files, created/edited time** | M | Multi-select chips; person = workspace-member picker (needs `0009` co-worker RLS); files = `media` upload; created/edited derived from the row's timestamps. |
| ✅ Code-block **syntax highlighting** | S | `@blocknote/code-block` (`codeBlockOptions`) wired into the editor. |
| ✅ **Empty states & error/loading boundaries** | S | `(app)/error.tsx` + `loading.tsx`; array-aware value display in gallery/list. |

---

## M7 — Permissions & collaboration completeness 🟡 (member management done)

The biggest correctness/security area still open. Access is **workspace-level**
today; Notion is per-page with inherited roles.

| Item | Effort | Notes |
| --- | --- | --- |
| ⬜ Per-page **sharing & roles** (view/comment/edit) | L | New `page_shares (page_id, principal, role)`; a `page_access(page_id, min_role)` SECURITY DEFINER helper that walks ancestry for **inherited** permissions; rewrite RLS on `pages`/`blocks`/`db_*`/`comments` to use it. Highest-risk change — **needs a live DB to verify policies**, so deferred. |
| ✅ Workspace **member management & invites** | M | Invite existing users by email (`find_user_id_by_email` SECURITY DEFINER), remove members, Members dialog; owner-managed (migration `0010`). Adding a member grants full workspace access, making realtime collab/comments usable by multiple people. |
| ⬜ **@mentions** in the editor (people & pages) | M | Custom BlockNote inline content + suggestion menu; store mention refs; render as links/chips. |
| ⬜ **Notifications** inbox | M | `notifications` table fed by mentions, comments, shares (DB triggers or app writes); a bell/inbox UI; mark-read. Depends on mentions/comments. |
| ⬜ **Block-level / inline comments** | M | Anchor comments to a block id (or a Yjs relative position); comment threads in the margin. Extends page-level comments from Phase 9. |

---

## M8 — Database power features 🟡 (relations done)

What separates a "table app" from Notion databases.

| Item | Effort | Notes |
| --- | --- | --- |
| ✅ **Relations** (link rows across databases) | L | `relation` property whose `config.relationDbId` points at another db; cell links rows (ids in `db_values`) with a picker + chips showing titles. No migration (additive). |
| ⬜ **Rollups** (aggregate over a relation) | L | Rollup property config (relation + target prop + function); compute client-side or via a SQL view/RPC. Depends on Relations. |
| ⬜ **Formulas** | L | A formula property with a small expression parser/evaluator over row values (functions, arithmetic, dates). Consider a vetted expression lib. |
| ⬜ **Sub-tasks / linked database views** | M | Embed a filtered view of another database inside a page (a "linked database" block). |
| ⬜ Per-view **row sort drag**, row height, wrap | S–M | Manual drag-ordering within table/board respecting `position`; display options in view config. |

---

## M9 — Editor richness (block parity)

| Item | Effort | Notes |
| --- | --- | --- |
| ⬜ **Callout** & **multi-column** layout | M | Callout = custom block; columns = `@blocknote/xl-multi-column`. |
| ⬜ **Bookmarks / link previews** & **embeds** (YouTube, Figma, etc.) | M | Custom blocks; a small unfurl endpoint (Open Graph fetch) for bookmark cards. |
| ⬜ **Synced blocks** | L | Shared block content reused across pages (a referenced Yjs fragment). |
| ⬜ **Backlinks** & page mentions index | M | Track page→page references; show "Linked references" at page bottom. |
| ⬜ **Table of contents**, **equations (KaTeX)**, **buttons** | S–M | Mostly BlockNote built-ins/custom blocks to enable. |
| ⬜ **Full-text content search** (ranked) | M | Replace title-only ILIKE with a `tsvector` over extracted block text (maintained on save) + ranked `search_pages` RPC; surface in ⌘K. |

---

## M10 — Productivity & content lifecycle

| Item | Effort | Notes |
| --- | --- | --- |
| ⬜ **Template gallery** + database templates | M | `templates` (or pages flagged `is_template`); "New from template"; per-database "new row template" with default property values. Builds on existing Duplicate. |
| ⬜ **Import** (Markdown, and ideally Notion/HTML) | M | BlockNote `tryParseMarkdownToBlocks`; bulk page import with hierarchy. |
| ⬜ **Version history** | M | `page_snapshots (page_id, content, created_by, created_at)`; periodic/Yjs-checkpoint snapshots; a restore UI. |
| ⬜ **Trash auto-purge** + workspace-wide trash view | S | Scheduled purge (Supabase cron / `pg_cron`) of items deleted >30d; a dedicated trash page. |
| ⬜ **Export**: whole-workspace / PDF server-side | M | Zip of Markdown; server-rendered PDF (current is browser print). |

---

## M11 — Scale, quality & accessibility

| Item | Effort | Notes |
| --- | --- | --- |
| ⬜ **Virtualization** | M | Virtualize long page block lists and large table/board/gallery views (e.g. TanStack Virtual). |
| ⬜ **Pagination / lazy load** for databases | M | Server-side range queries for big row sets instead of fetching all rows. |
| ⬜ Broader **optimistic updates** | S–M | Optimistic cache writes for reorder, favorite, db cell edits to remove latency. |
| ⬜ **Accessibility pass** | M | Keyboard nav for menus/popovers (Esc/focus trap), ARIA labels, focus rings; audit with axe. |
| ⬜ **Automated tests** | L | Unit (filters/sort, db helpers), integration (RLS policies), and Playwright e2e (auth, editing, collab, publish). None exist today. |
| ⬜ **Observability** | S | Error tracking (Sentry), basic analytics. |

---

## M12 — Platform & account

| Item | Effort | Notes |
| --- | --- | --- |
| ⬜ **Settings** (account, workspace, appearance) | M | Profile (name/avatar), workspace name/icon, theme, danger zone. |
| ⬜ **OAuth providers** (Google/GitHub) | S | Enable in Supabase Auth + buttons on `/login`. |
| ⬜ **Multiple workspaces / teamspaces** | M | Workspace switcher; the schema already supports multiple — wire UI + creation/membership flows. |
| ⬜ **Offline support / PWA** | L | Yjs IndexedDB persistence (`y-indexeddb`) + service worker; offline edit queue (the deferred Phase 8 item). |
| ⬜ **Public API / integrations & webhooks** | L | Token-auth REST surface mirroring core objects. |

---

## M13 — Optional / differentiators

| Item | Effort | Notes |
| --- | --- | --- |
| ⬜ **AI assistant** (write/summarize/Q&A) | M–L | Use the latest Claude models via the Anthropic API; per-page context + RAG over workspace. |
| ⬜ **Calendar/timeline (Gantt)** enhancements | M | Drag-to-reschedule on calendar; a timeline view with dependencies. |
| ⬜ **Slash-command extensions & custom blocks SDK** | M | Let power users add blocks. |

---

## Recommended sequencing

1. **M6** first — cheap wins that polish what already exists.
2. **M7** next — per-page permissions is the most important *correctness* gap and unblocks real multi-user use; do it before exposing the app widely.
3. **M8 / M9** — the depth features that make it *feel* like Notion (databases + rich blocks); pick based on your users.
4. **M10 / M11** — lifecycle + hardening before any production launch.
5. **M12 / M13** — platform breadth and differentiators.

## Cross-cutting reminders
- Every schema change = a new numbered migration in `supabase/migrations/` + regenerate `types/database.ts` (rows as `type`, not `interface`).
- Keep the build green (`npm run build`) and run a focused review before each merge.
- Re-run/extend the Docker stack (`docker-compose.yml`) when new services are needed (none expected until offline/API work).
</content>
