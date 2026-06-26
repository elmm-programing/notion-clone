-- M7: workspace member management — invite existing users by email, remove them.
-- (Per-page sharing roles / mentions / notifications are a later pass.)

-- Resolve an email to a user id (SECURITY DEFINER so you can invite users you
-- don't yet share a workspace with). Returns null if nobody has signed up.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.profiles where lower(email) = lower(p_email) limit 1;
$$;

grant execute on function public.find_user_id_by_email(text) to authenticated;

-- The workspace owner may add/remove members.
create policy "members_insert_owner" on public.workspace_members
  for insert with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "members_delete_owner" on public.workspace_members
  for delete using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );
