-- Phase 7 — databases: properties, per-row values, and saved views.
-- A "database" is a page with is_database = true. Its rows are child pages
-- (parent_id = the database page); each row's property values live in db_values.

-- ---------------------------------------------------------------------------
-- Membership helper for any page (used by the db_* RLS policies)
-- ---------------------------------------------------------------------------

create or replace function public.can_access_page(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.pages p
    where p.id = p_id and public.is_workspace_member(p.workspace_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.db_properties (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,  -- the database
  name text not null default 'Property',
  type text not null default 'text',  -- text|number|select|checkbox|date|url
  config jsonb not null default '{}'::jsonb,  -- e.g. { "options": ["A","B"] }
  position double precision not null default extract(epoch from now()),
  created_at timestamptz not null default now()
);
create index if not exists db_properties_page_idx on public.db_properties (page_id);

create table if not exists public.db_values (
  page_id uuid not null references public.pages on delete cascade,        -- the row
  property_id uuid not null references public.db_properties on delete cascade,
  value jsonb,
  primary key (page_id, property_id)
);

create table if not exists public.db_views (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,  -- the database
  type text not null default 'table',  -- table|board|gallery|list|calendar
  name text not null default 'Table',
  config jsonb not null default '{}'::jsonb,  -- { filters, sorts, groupBy, ... }
  position double precision not null default extract(epoch from now()),
  created_at timestamptz not null default now()
);
create index if not exists db_views_page_idx on public.db_views (page_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — membership of the owning database page's workspace
-- ---------------------------------------------------------------------------

alter table public.db_properties enable row level security;
alter table public.db_values enable row level security;
alter table public.db_views enable row level security;

create policy "db_properties_all" on public.db_properties
  for all using (public.can_access_page(page_id))
  with check (public.can_access_page(page_id));

create policy "db_values_all" on public.db_values
  for all using (public.can_access_page(page_id))
  with check (public.can_access_page(page_id));

create policy "db_views_all" on public.db_views
  for all using (public.can_access_page(page_id))
  with check (public.can_access_page(page_id));
