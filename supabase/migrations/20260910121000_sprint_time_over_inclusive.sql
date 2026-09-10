-- Treat 21:10:00 JST as closed (limit ended).

create or replace function public.submit_sprint_attempt(
  p_problem_id uuid,
  p_answer text default null
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  actor uuid := (select auth.uid());
  rec record;
begin
  if actor is null then
    raise exception 'not authenticated';
  end if;

  select p.id, p.is_sprint, p.publish_at, p.sprint_day
    into rec
  from public.problems p
  where p.id = p_problem_id;

  if rec.id is null or not rec.is_sprint then
    raise exception 'NOT_AVAILABLE';
  end if;
  if now() < rec.publish_at then
    raise exception 'NOT_OPEN';
  end if;
  if now() >= rec.publish_at + interval '10 minutes' then
    raise exception 'TIME_OVER';
  end if;

  insert into public.sprint_attempts (user_id, problem_id, solver_answer, submitted_at)
  values (actor, p_problem_id, nullif(btrim(coalesce(p_answer, '')), ''), now())
  on conflict (user_id, problem_id)
  do update set
    solver_answer = coalesce(excluded.solver_answer, public.sprint_attempts.solver_answer);

  return jsonb_build_object(
    'ok', true,
    'problemId', rec.id,
    'submittedAt', now(),
    'closesAt', rec.publish_at + interval '10 minutes'
  );
end;
$$;
