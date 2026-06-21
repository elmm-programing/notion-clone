-- Phase 4 — favorites, covers storage bucket, page position default

-- ---------------------------------------------------------------------------
-- Favorites (pinned pages, per user)
-- ---------------------------------------------------------------------------

create table if not exists public.favorites (
  user_id uuid not null references auth.users on delete cascade,
  page_id uuid not null references public.pages on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, page_id)
);

alter table public.favorites enable row level security;

create policy "favorites_select_own" on public.favorites
  for select using (user_id = auth.uid());
create policy "favorites_insert_own" on public.favorites
  for insert with check (user_id = auth.uid());
create policy "favorites_delete_own" on public.favorites
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- New pages get a monotonically increasing position so ordering is stable.
-- Reordering then writes fractional midpoints between neighbours.
-- ---------------------------------------------------------------------------

alter table public.pages
  alter column position set default extract(epoch from now());

-- ---------------------------------------------------------------------------
-- Storage bucket for page cover images (public read, authenticated write)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "covers_public_read" on storage.objects
  for select using (bucket_id = 'covers');
create policy "covers_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'covers');
create policy "covers_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'covers');
create policy "covers_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'covers');
