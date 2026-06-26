-- M9: full-text-ish search over page body text (not just titles).
-- The app maintains pages.content_text (plain text of the block document) on save.

alter table public.pages add column if not exists content_text text;

create index if not exists pages_content_trgm_idx
  on public.pages using gin (content_text gin_trgm_ops);

-- Search a workspace's pages by title OR body text. SECURITY INVOKER so the
-- caller's RLS still scopes results; p_q is a bound parameter (injection-safe).
create or replace function public.search_pages(p_workspace uuid, p_q text)
returns setof public.pages
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.pages
  where workspace_id = p_workspace
    and deleted_at is null
    and (
      title ilike '%' || p_q || '%'
      or content_text ilike '%' || p_q || '%'
    )
  order by updated_at desc
  limit 25;
$$;

grant execute on function public.search_pages(uuid, text) to authenticated;
