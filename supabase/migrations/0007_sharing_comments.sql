-- Phase 9 — public links (publish to web) and comments.

-- ---------------------------------------------------------------------------
-- Public links: a page can be published read-only under a slug.
-- ---------------------------------------------------------------------------

create table if not exists public.public_links (
  page_id uuid primary key references public.pages on delete cascade,
  slug text unique not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.public_links enable row level security;

-- Workspace members manage the link; anyone may read an *enabled* link
-- (needed to resolve slug -> page for the public route).
create policy "public_links_member_all" on public.public_links
  for all using (public.can_access_page(page_id))
  with check (public.can_access_page(page_id));
create policy "public_links_public_read" on public.public_links
  for select using (enabled);

-- Allow anonymous read of a page when it has an enabled public link.
create or replace function public.is_page_public(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.public_links pl
    where pl.page_id = p_id and pl.enabled
  );
$$;

create policy "pages_select_public" on public.pages
  for select using (public.is_page_public(id));

-- ---------------------------------------------------------------------------
-- Comments (page-level threads)
-- ---------------------------------------------------------------------------

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  author_email text,
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists comments_page_idx on public.comments (page_id);

alter table public.comments enable row level security;

create policy "comments_select" on public.comments
  for select using (public.can_access_page(page_id));
create policy "comments_insert" on public.comments
  for insert with check (public.can_access_page(page_id) and author_id = auth.uid());
create policy "comments_update" on public.comments
  for update using (public.can_access_page(page_id));
create policy "comments_delete" on public.comments
  for delete using (author_id = auth.uid());
