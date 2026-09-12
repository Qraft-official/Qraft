-- Record answer/explanation reveals in DB and exclude those attempts from
-- solve stats. Existing rows stay eligible (no backfill guesswork).

create table if not exists public.problem_spoilers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  answer_revealed_at timestamptz,
  explanation_revealed_at timestamptz,
  primary key (user_id, problem_id)
);

create index if not exists problem_spoilers_problem_idx
  on public.problem_spoilers (problem_id);

alter table public.problem_spoilers enable row level security;
revoke all on public.problem_spoilers from public, anon, authenticated;

drop policy if exists "problem_spoilers_select_own" on public.problem_spoilers;
create policy "problem_spoilers_select_own"
  on public.problem_spoilers for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.problem_spoilers to authenticated;

alter table public.problem_attempts
  add column if not exists eligible_for_metrics boolean not null default true;

alter table public.sprint_attempts
  add column if not exists eligible_for_metrics boolean not null default true;

create or replace function public.spoiler_before_submit(
  p_user uuid,
  p_problem uuid,
  p_submitted timestamptz
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.problem_spoilers s
    where s.user_id = p_user
      and s.problem_id = p_problem
      and (
        (s.answer_revealed_at is not null and s.answer_revealed_at < p_submitted)
        or (s.explanation_revealed_at is not null and s.explanation_revealed_at < p_submitted)
      )
  );
$$;

revoke all on function public.spoiler_before_submit(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.spoiler_before_submit(uuid, uuid, timestamptz) to service_role;

create or replace function public.record_problem_spoiler(p_problem_id uuid, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := (select auth.uid());
  kind text := lower(btrim(coalesce(p_kind, '')));
  rec public.problem_spoilers;
begin
  if uid is null then
    raise exception 'NOT_AUTH';
  end if;
  if kind not in ('answer', 'explanation') then
    raise exception 'BAD_KIND';
  end if;
  if p_problem_id is null then
    raise exception 'NOT_FOUND';
  end if;
  if not exists (select 1 from public.problems p where p.id = p_problem_id) then
    raise exception 'NOT_FOUND';
  end if;

  insert into public.problem_spoilers (user_id, problem_id)
  values (uid, p_problem_id)
  on conflict (user_id, problem_id) do nothing;

  if kind = 'answer' then
    update public.problem_spoilers
    set answer_revealed_at = coalesce(answer_revealed_at, now())
    where user_id = uid and problem_id = p_problem_id;
  else
    update public.problem_spoilers
    set explanation_revealed_at = coalesce(explanation_revealed_at, now())
    where user_id = uid and problem_id = p_problem_id;
  end if;

  select * into rec
  from public.problem_spoilers
  where user_id = uid and problem_id = p_problem_id;

  return jsonb_build_object(
    'problemId', rec.problem_id,
    'answerRevealedAt', rec.answer_revealed_at,
    'explanationRevealedAt', rec.explanation_revealed_at
  );
end;
$$;

revoke all on function public.record_problem_spoiler(uuid, text) from public, anon;
grant execute on function public.record_problem_spoiler(uuid, text) to authenticated;

create or replace function public.on_attempt_before_submit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    if new.submitted_at is null then
      new.started_at := now();
      new.duration_seconds := null;
      new.eligible_for_metrics := true;
    else
      new.submitted_at := now();
      new.started_at := null;
      new.duration_seconds := null;
      new.eligible_for_metrics := not public.spoiler_before_submit(new.user_id, new.problem_id, new.submitted_at);
    end if;
  elsif tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.problem_id := old.problem_id;
    new.started_at := old.started_at;
    if old.submitted_at is not null then
      new.submitted_at := old.submitted_at;
      new.duration_seconds := old.duration_seconds;
      new.grade := coalesce(old.grade, new.grade);
      new.eligible_for_metrics := old.eligible_for_metrics;
    elsif new.submitted_at is not null then
      new.submitted_at := now();
      new.eligible_for_metrics := not public.spoiler_before_submit(new.user_id, new.problem_id, new.submitted_at);
      if old.started_at is null then
        new.duration_seconds := null;
      else
        new.duration_seconds := greatest(
          0,
          round(extract(epoch from (new.submitted_at - old.started_at)))::int
        );
      end if;
    else
      new.eligible_for_metrics := coalesce(old.eligible_for_metrics, true);
    end if;
  end if;

  if new.submitted_at is not null
     and new.grade = 'incorrect'
     and new.revenge_available_at is null then
    new.revenge_available_at := coalesce(new.submitted_at, now()) + interval '3 days';
  end if;
  return new;
end;
$$;

create or replace function public.refresh_problem_solve_stats(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.problems p
  set
    grade_n = coalesce(s.solvers, 0),
    grade_correct = coalesce(s.corrects, 0),
    duration_n = coalesce(s.dur_n, 0),
    duration_sum = coalesce(s.dur_sum, 0)
  from (
    select
      count(*)::int as solvers,
      count(*) filter (where grade = 'correct')::int as corrects,
      count(duration_seconds) filter (
        where duration_seconds is not null
          and duration_seconds >= 15
          and duration_seconds <= 7200
      )::int as dur_n,
      coalesce(sum(duration_seconds) filter (
        where duration_seconds is not null
          and duration_seconds >= 15
          and duration_seconds <= 7200
      ), 0)::int as dur_sum
    from (
      select distinct on (user_id)
        grade, duration_seconds
      from public.problem_attempts
      where problem_id = p_id
        and submitted_at is not null
        and grade in ('correct', 'incorrect')
        and coalesce(eligible_for_metrics, true)
      order by user_id, submitted_at asc
    ) firsts
  ) s
  where p.id = p_id
    and not coalesce(p.is_sprint, false);
end;
$$;

create or replace function public.problem_analytics_detail(p_id uuid, p_viewer uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  rec record;
  firsts jsonb;
  result jsonb;
  use_hour boolean;
  excluded int;
begin
  if p_viewer is null then
    raise exception 'NOT_AUTH';
  end if;

  select p.id, p.author_id, p.is_sprint, p.created_at, p.difficulty_level
    into rec
  from public.problems p
  where p.id = p_id
    and (p.publish_at is null or p.publish_at <= now() or p.author_id = p_viewer)
    and (
      not coalesce(p.is_sprint, false)
      or (p.sprint_day is not null and p.publish_at is not null and now() >= p.publish_at)
      or p.author_id = p_viewer
    );
  if rec.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if coalesce(rec.is_sprint, false) then
    raise exception 'NOT_REGULAR';
  end if;

  select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) into firsts
  from (
    select distinct on (a.user_id)
      a.grade,
      a.duration_seconds,
      a.submitted_at
    from public.problem_attempts a
    where a.problem_id = p_id
      and a.submitted_at is not null
      and a.grade in ('correct', 'incorrect')
      and coalesce(a.eligible_for_metrics, true)
    order by a.user_id, a.submitted_at asc
  ) f;

  select count(*)::int into excluded
  from (
    select distinct on (a.user_id) a.id
    from public.problem_attempts a
    where a.problem_id = p_id
      and a.submitted_at is not null
      and a.grade in ('correct', 'incorrect')
      and coalesce(a.eligible_for_metrics, true) = false
    order by a.user_id, a.submitted_at asc
  ) x;

  use_hour := rec.created_at > now() - interval '48 hours';

  result := jsonb_build_object(
    'problemId', rec.id,
    'authorId', rec.author_id,
    'isAuthor', rec.author_id = p_viewer,
    'difficultyLevel', rec.difficulty_level,
    'solvers', (select count(*) from jsonb_array_elements(firsts)),
    'excludedSolvers', excluded,
    'correct', (
      select count(*) from jsonb_array_elements(firsts) x
      where x->>'grade' = 'correct'
    ),
    'incorrect', (
      select count(*) from jsonb_array_elements(firsts) x
      where x->>'grade' = 'incorrect'
    ),
    'duration', (
      select jsonb_build_object(
        'n', count(*),
        'avg', avg(d)::int,
        'median', percentile_cont(0.5) within group (order by d)::int,
        'fastest', min(d),
        'p25', percentile_cont(0.25) within group (order by d)::int,
        'p75', percentile_cont(0.75) within group (order by d)::int,
        'p90', percentile_cont(0.90) within group (order by d)::int
      )
      from (
        select (x->>'duration_seconds')::int as d
        from jsonb_array_elements(firsts) x
        where (x->>'duration_seconds') is not null
          and (x->>'duration_seconds')::int >= 15
          and (x->>'duration_seconds')::int <= 7200
      ) t
    ),
    'durationByGrade', (
      select jsonb_build_object(
        'correctAvg', (select avg(d)::int from (
          select (x->>'duration_seconds')::int as d
          from jsonb_array_elements(firsts) x
          where x->>'grade' = 'correct'
            and (x->>'duration_seconds') is not null
            and (x->>'duration_seconds')::int >= 15
            and (x->>'duration_seconds')::int <= 7200
        ) c),
        'incorrectAvg', (select avg(d)::int from (
          select (x->>'duration_seconds')::int as d
          from jsonb_array_elements(firsts) x
          where x->>'grade' = 'incorrect'
            and (x->>'duration_seconds') is not null
            and (x->>'duration_seconds')::int >= 15
            and (x->>'duration_seconds')::int <= 7200
        ) i)
      )
    )
  );

  if rec.author_id = p_viewer then
    result := result || jsonb_build_object(
      'series', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'bucket', bucket,
          'solvers', n,
          'correct', c,
          'avgDuration', avg_d
        ) order by bucket), '[]'::jsonb)
        from (
          select
            case when use_hour
              then date_trunc('hour', submitted_at at time zone 'Asia/Tokyo')
              else date_trunc('day', submitted_at at time zone 'Asia/Tokyo')
            end as bucket,
            count(*)::int as n,
            count(*) filter (where grade = 'correct')::int as c,
            avg(duration_seconds) filter (
              where duration_seconds is not null
                and duration_seconds >= 15
                and duration_seconds <= 7200
            )::int as avg_d
          from (
            select distinct on (user_id)
              grade, duration_seconds, submitted_at
            from public.problem_attempts
            where problem_id = p_id
              and submitted_at is not null
              and grade in ('correct', 'incorrect')
              and coalesce(eligible_for_metrics, true)
            order by user_id, submitted_at asc
          ) firsts2
          group by 1
        ) buckets
      ),
      'seriesGrain', case when use_hour then 'hour' else 'day' end
    );
  end if;

  return result;
end;
$$;

revoke all on function public.problem_analytics_detail(uuid, uuid) from public, anon, authenticated;
grant execute on function public.problem_analytics_detail(uuid, uuid) to service_role;

create or replace function public.protect_sprint_attempt_metrics()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    new.eligible_for_metrics := not public.spoiler_before_submit(
      new.user_id,
      new.problem_id,
      coalesce(new.submitted_at, now())
    );
  elsif old.submitted_at is not null then
    new.eligible_for_metrics := old.eligible_for_metrics;
  else
    new.eligible_for_metrics := not public.spoiler_before_submit(
      new.user_id,
      new.problem_id,
      coalesce(new.submitted_at, now())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_sprint_attempt_metrics on public.sprint_attempts;
create trigger trg_protect_sprint_attempt_metrics
before insert or update on public.sprint_attempts
for each row
execute function public.protect_sprint_attempt_metrics();

-- PULSE public accuracy uses the same eligible-only first graded attempt rule.
-- Duration is not stored on sprint_attempts; leave duration_* unchanged.
create or replace function public.refresh_sprint_solve_stats(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.problems p
  set
    grade_n = coalesce(s.solvers, 0),
    grade_correct = coalesce(s.corrects, 0)
  from (
    select
      count(*)::int as solvers,
      count(*) filter (where grade = 'correct')::int as corrects
    from public.sprint_attempts
    where problem_id = p_id
      and grade in ('correct', 'incorrect')
      and coalesce(eligible_for_metrics, true)
  ) s
  where p.id = p_id
    and coalesce(p.is_sprint, false);
end;
$$;

create or replace function public.on_sprint_attempt_after()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.refresh_sprint_solve_stats(new.problem_id);
  return new;
end;
$$;

drop trigger if exists trg_sprint_attempt_after on public.sprint_attempts;
create trigger trg_sprint_attempt_after
after insert or update on public.sprint_attempts
for each row
execute function public.on_sprint_attempt_after();

create or replace function public.learning_card_state(p_ids uuid[])
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'public'
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    return '{}'::jsonb;
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then
    return jsonb_build_object(
      'saved', '{}'::jsonb,
      'votes', '{}'::jsonb,
      'attempts', '{}'::jsonb
    );
  end if;
  return jsonb_build_object(
    'saved', coalesce((
      select jsonb_object_agg(s.problem_id::text, s.category)
      from public.saved_problems s
      where s.user_id = uid and s.problem_id = any(p_ids)
    ), '{}'::jsonb),
    'votes', coalesce((
      select jsonb_object_agg(v.problem_id::text, v.vote)
      from public.difficulty_votes v
      where v.user_id = uid and v.problem_id = any(p_ids)
    ), '{}'::jsonb),
    'attempts', coalesce((
      select jsonb_object_agg(a.problem_id::text, jsonb_build_object(
        'grade', a.grade,
        'durationSeconds', a.duration_seconds,
        'submittedAt', a.submitted_at,
        'isRevenge', a.is_revenge,
        'revengeAvailableAt', a.revenge_available_at,
        'revengeCompletedAt', a.revenge_completed_at,
        'eligibleForMetrics', coalesce(a.eligible_for_metrics, true)
      ))
      from (
        select distinct on (problem_id)
          problem_id, grade, duration_seconds, submitted_at, is_revenge,
          revenge_available_at, revenge_completed_at, eligible_for_metrics
        from public.problem_attempts
        where user_id = uid
          and problem_id = any(p_ids)
          and submitted_at is not null
        order by problem_id, submitted_at desc
      ) a
    ), '{}'::jsonb)
  );
end;
$$;

revoke all on function public.learning_card_state(uuid[]) from public, anon;
grant execute on function public.learning_card_state(uuid[]) to authenticated;
