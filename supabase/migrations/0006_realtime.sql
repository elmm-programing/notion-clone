-- Phase 8 — realtime collaboration: durable Yjs document state per page.
-- The live sync runs over Supabase Realtime; this table persists the CRDT
-- state so a document survives when no peers are connected.

create table if not exists public.yjs_documents (
  page_id uuid primary key references public.pages on delete cascade,
  state text,                       -- base64(Y.encodeStateAsUpdate(doc))
  updated_at timestamptz not null default now()
);

alter table public.yjs_documents enable row level security;

create policy "yjs_documents_all" on public.yjs_documents
  for all using (public.can_access_page(page_id))
  with check (public.can_access_page(page_id));
