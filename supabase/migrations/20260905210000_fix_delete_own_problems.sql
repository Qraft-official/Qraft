-- Own-post DELETE must not require can_use_app().
-- During prelaunch, can_use_app() is false for non-admin / non-EA users, so
-- PostgREST DELETE matched 0 rows, returned no error, and the post reappeared on refetch.

drop policy if exists "users can delete own problems" on public.problems;
drop policy if exists "admins can delete problems" on public.problems;

create policy "users can delete own problems"
  on public.problems for delete
  to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

create or replace function public.delete_own_problem(p_problem_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  delete from public.problems
  where id = p_problem_id
    and (author_id = (select auth.uid()) or public.is_admin())
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'NOT_OWNER_OR_MISSING';
  end if;

  return deleted_id;
end;
$$;

revoke all on function public.delete_own_problem(uuid) from public, anon;
grant execute on function public.delete_own_problem(uuid) to authenticated;
