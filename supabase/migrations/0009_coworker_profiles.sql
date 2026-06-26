-- M6: allow reading the profiles of users you share a workspace with, so the
-- "person" database property can list/display workspace members.

create policy "profiles_select_coworkers" on public.profiles
  for select using (
    exists (
      select 1
      from public.workspace_members m1
      join public.workspace_members m2 on m1.workspace_id = m2.workspace_id
      where m1.user_id = auth.uid()
        and m2.user_id = profiles.id
    )
  );

-- Members may list everyone in a workspace they belong to (was: own row only).
create policy "members_select_workspace" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
