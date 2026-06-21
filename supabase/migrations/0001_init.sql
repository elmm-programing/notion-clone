-- Notion clone — initial schema
-- Run in the Supabase SQL editor, or via the Supabase CLI:
--   supabase db push

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Workspace',
  icon text,
  owner_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  parent_id uuid references public.pages on delete cascade,
  title text not null default 'Untitled',
  icon text,
  cover_url text,
  content jsonb,
  is_database boolean not null default false,
  position double precision not null default 0,
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists pages_workspace_idx on public.pages (workspace_id);
create index if not exists pages_parent_idx on public.pages (parent_id);

-- ---------------------------------------------------------------------------
-- Membership helper (SECURITY DEFINER avoids RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.pages enable row level security;

-- profiles: a user manages only their own row
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- workspaces: members can read; owner can do anything
create policy "workspaces_select_member" on public.workspaces
  for select using (public.is_workspace_member(id));
create policy "workspaces_modify_owner" on public.workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- workspace_members: a user sees their own memberships
create policy "members_select_self" on public.workspace_members
  for select using (user_id = auth.uid());

-- pages: any workspace member can read/write
create policy "pages_select_member" on public.pages
  for select using (public.is_workspace_member(workspace_id));
create policy "pages_insert_member" on public.pages
  for insert with check (public.is_workspace_member(workspace_id));
create policy "pages_update_member" on public.pages
  for update using (public.is_workspace_member(workspace_id));
create policy "pages_delete_member" on public.pages
  for delete using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- On signup: create profile + default workspace + owner membership
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  insert into public.workspaces (name, owner_id)
  values ('My Workspace', new.id)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
