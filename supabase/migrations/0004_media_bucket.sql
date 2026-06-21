-- Phase 6 — storage bucket for in-page media (images, files, video, audio)

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Media objects are stored under "<pageId>/<file>", same convention as covers,
-- so the existing can_access_page_cover() membership check applies.

create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media_member_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.can_access_page_cover(name));
create policy "media_member_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.can_access_page_cover(name));
create policy "media_member_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.can_access_page_cover(name));
