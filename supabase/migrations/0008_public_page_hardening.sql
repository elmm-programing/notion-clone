-- Phase 9 review fixes: harden public-page access + comment updates.

-- ---------------------------------------------------------------------------
-- Fix #1 / #3: replace the broad anon-facing policies with a SECURITY DEFINER
-- resolver. Anon can no longer enumerate published links or read arbitrary
-- published pages by id — a page is only returned for an exact, enabled slug
-- (and not when soft-deleted).
-- ---------------------------------------------------------------------------

drop policy if exists "pages_select_public" on public.pages;
drop policy if exists "public_links_public_read" on public.public_links;
drop function if exists public.is_page_public(uuid);

create or replace function public.get_public_page(p_slug text)
returns setof public.pages
language sql
security definer
stable
set search_path = public
as $$
  select pg.*
  from public.pages pg
  join public.public_links pl on pl.page_id = pg.id
  where pl.slug = p_slug
    and pl.enabled
    and pg.deleted_at is null;
$$;

grant execute on function public.get_public_page(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fix #2: members may only flip a comment's `resolved` flag; the body and
-- author are immutable via the API. (Authors can still delete their own.)
-- The subquery reads the pre-update row, so changing body/author_id is rejected.
-- ---------------------------------------------------------------------------

drop policy if exists "comments_update" on public.comments;

create policy "comments_resolve" on public.comments
  for update using (public.can_access_page(page_id))
  with check (
    public.can_access_page(page_id)
    and body = (select c.body from public.comments c where c.id = comments.id)
    and author_id = (select c.author_id from public.comments c where c.id = comments.id)
  );
