-- Phase 4 fixes + Phase 5 search helpers

-- ---------------------------------------------------------------------------
-- Fix #1: soft delete / restore must cascade to the whole subtree so subpages
-- never become orphaned (invisible in nav and absent from trash).
-- security invoker => the caller's RLS still applies.
-- ---------------------------------------------------------------------------

create or replace function public.soft_delete_page(p_id uuid)
returns void
language sql
security invoker
as $$
  with recursive sub as (
    select id from public.pages where id = p_id
    union all
    select c.id from public.pages c join sub on c.parent_id = sub.id
  )
  update public.pages
     set deleted_at = now()
   where id in (select id from sub)
     and deleted_at is null;
$$;

create or replace function public.restore_page(p_id uuid)
returns void
language sql
security invoker
as $$
  with recursive sub as (
    select id from public.pages where id = p_id
    union all
    select c.id from public.pages c join sub on c.parent_id = sub.id
  )
  update public.pages
     set deleted_at = null
   where id in (select id from sub);
$$;

-- ---------------------------------------------------------------------------
-- Fix #3: scope cover-bucket writes to members of the owning page's workspace.
-- Cover objects are stored under "<pageId>/<file>"; derive the page from the
-- first path segment.
-- ---------------------------------------------------------------------------

create or replace function public.can_access_page_cover(objname text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.pages p
    where p.id::text = split_part(objname, '/', 1)
      and public.is_workspace_member(p.workspace_id)
  );
$$;

drop policy if exists "covers_auth_insert" on storage.objects;
drop policy if exists "covers_auth_update" on storage.objects;
drop policy if exists "covers_auth_delete" on storage.objects;

create policy "covers_member_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and public.can_access_page_cover(name));
create policy "covers_member_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and public.can_access_page_cover(name));
create policy "covers_member_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and public.can_access_page_cover(name));

-- ---------------------------------------------------------------------------
-- Phase 5: quick-switcher search runs a case-insensitive title match
-- (pages.title ILIKE '%q%'). A trigram index keeps that fast as data grows.
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm;

create index if not exists pages_title_trgm_idx
  on public.pages using gin (title gin_trgm_ops);
