-- Atomic bookmark toggle. Uses auth.uid() so RLS/user_id cannot drift from the session.
create or replace function public.toggle_saved_problem(
  p_problem_id uuid,
  p_want_saved boolean,
  p_category text default 'later'
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  uid uuid := (select auth.uid());
  cat text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_problem_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_problem');
  end if;
  if not exists (select 1 from public.problems p where p.id = p_problem_id) then
    return jsonb_build_object('ok', false, 'error', 'problem_not_found');
  end if;

  cat := coalesce(nullif(btrim(p_category), ''), 'later');
  if cat not in ('later', 'exam', 'hard') then
    cat := 'later';
  end if;

  if p_want_saved then
    insert into public.saved_problems (user_id, problem_id, category)
    values (uid, p_problem_id, cat)
    on conflict (user_id, problem_id) do update
      set category = excluded.category;
    if not exists (
      select 1 from public.saved_problems s
      where s.user_id = uid and s.problem_id = p_problem_id
    ) then
      return jsonb_build_object('ok', false, 'error', 'save_not_persisted');
    end if;
    return jsonb_build_object('ok', true, 'saved', true, 'category', cat);
  end if;

  delete from public.saved_problems
  where user_id = uid and problem_id = p_problem_id;

  return jsonb_build_object('ok', true, 'saved', false, 'category', null);
end;
$$;

revoke all on function public.toggle_saved_problem(uuid, boolean, text) from public, anon;
grant execute on function public.toggle_saved_problem(uuid, boolean, text) to authenticated;
