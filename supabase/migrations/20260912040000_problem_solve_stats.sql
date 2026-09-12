-- Unique-user solve stats, server-side attempt timestamps, Discover sort RPC,
-- and Premium problem analytics. Does not rewrite prior migrations.

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
    else
      -- Direct submit without an open attempt: do not invent a start time.
      new.submitted_at := now();
      new.started_at := null;
      new.duration_seconds := null;
    end if;
  elsif tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.problem_id := old.problem_id;
    new.started_at := old.started_at;
    if old.submitted_at is not null then
      new.submitted_at := old.submitted_at;
      new.duration_seconds := old.duration_seconds;
      new.grade := coalesce(old.grade, new.grade);
    elsif new.submitted_at is not null then
      new.submitted_at := now();
      if old.started_at is null then
        new.duration_seconds := null;
      else
        new.duration_seconds := greatest(
          0,
          round(extract(epoch from (new.submitted_at - old.started_at)))::int
        );
      end if;
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
      order by user_id, submitted_at asc
    ) firsts
  ) s
  where p.id = p_id
    and not coalesce(p.is_sprint, false);
end;
$$;

create or replace function public.on_attempt_after_submit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  is_pulse boolean := false;
  just_submitted boolean := false;
begin
  if tg_op = 'INSERT' then
    just_submitted := new.submitted_at is not null;
  else
    just_submitted := new.submitted_at is not null and old.submitted_at is null;
  end if;
  if not just_submitted then
    return new;
  end if;

  select coalesce(p.is_sprint, false) into is_pulse
  from public.problems p
  where p.id = new.problem_id;

  perform public.record_learning_activity(
    new.user_id,
    case when is_pulse then 'pulse' else 'solve' end,
    new.problem_id
  );

  if not is_pulse then
    perform public.refresh_problem_solve_stats(new.problem_id);
  end if;

  if new.grade = 'correct' then
    update public.problem_attempts
    set revenge_completed_at = new.submitted_at
    where user_id = new.user_id
      and problem_id = new.problem_id
      and id <> new.id
      and grade = 'incorrect'
      and revenge_completed_at is null;
  end if;
  return new;
end;
$$;

-- Recount existing regular problems from first graded submit per user.
update public.problems p
set
  grade_n = coalesce(s.solvers, 0),
  grade_correct = coalesce(s.corrects, 0),
  duration_n = coalesce(s.dur_n, 0),
  duration_sum = coalesce(s.dur_sum, 0)
from (
  select
    problem_id,
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
    select distinct on (user_id, problem_id)
      problem_id, grade, duration_seconds
    from public.problem_attempts
    where submitted_at is not null
      and grade in ('correct', 'incorrect')
    order by user_id, problem_id, submitted_at asc
  ) firsts
  group by problem_id
) s
where s.problem_id = p.id
  and not coalesce(p.is_sprint, false);

create index if not exists problems_discover_created_idx
  on public.problems (created_at desc)
  where not coalesce(is_sprint, false);

create index if not exists problems_stats_grade_idx
  on public.problems (grade_n, grade_correct)
  where not coalesce(is_sprint, false);

create index if not exists problems_stats_duration_idx
  on public.problems (duration_n, duration_sum)
  where not coalesce(is_sprint, false);

create or replace function public.discover_problems(
  p_sort text,
  p_subject text default null,
  p_mode text default null,
  p_level integer default null,
  p_q text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  author_id uuid,
  title text,
  problem_text text,
  solution text,
  subject text,
  photo text,
  is_sprint boolean,
  sprint_day date,
  publish_at timestamptz,
  topic text,
  pages jsonb,
  problem_format text,
  created_at timestamptz,
  mode text,
  correct_answer text,
  difficulty_level smallint,
  confused_count integer,
  is_hard_spotlight boolean,
  promoted boolean,
  promoted_at timestamptz,
  duration_sum integer,
  duration_n integer,
  grade_correct integer,
  grade_n integer,
  series_id uuid,
  series_ord integer,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path to 'public'
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 20), 50));
  off int := greatest(0, coalesce(p_offset, 0));
  sort_key text := coalesce(p_sort, 'newest');
  q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  return query
  with base as (
    select p.*
    from public.problems p
    where not coalesce(p.is_sprint, false)
      and (p.publish_at is null or p.publish_at <= now())
      and (p_subject is null or p_subject = 'all' or p.subject = p_subject)
      and (p_mode is null or p_mode = 'all' or p.mode = p_mode)
      and (p_level is null or p.difficulty_level = p_level)
      and (
        q is null
        or p.title ilike '%' || q || '%'
        or p.problem_text ilike '%' || q || '%'
        or coalesce(p.topic, '') ilike '%' || q || '%'
      )
  ),
  counted as (
    select b.*, count(*) over() as total_count
    from base b
  )
  select
    c.id, c.author_id, c.title, c.problem_text, c.solution, c.subject, c.photo,
    c.is_sprint, c.sprint_day, c.publish_at, c.topic, c.pages, c.problem_format,
    c.created_at, c.mode, c.correct_answer, c.difficulty_level, c.confused_count,
    c.is_hard_spotlight, c.promoted, c.promoted_at, c.duration_sum, c.duration_n,
    c.grade_correct, c.grade_n, c.series_id, c.series_ord, c.total_count
  from counted c
  order by
    case when sort_key = 'accuracy_asc' then (c.grade_n >= 3) end desc nulls last,
    case when sort_key = 'accuracy_asc' then (c.grade_correct::numeric / nullif(c.grade_n, 0)) end asc nulls last,
    case when sort_key = 'accuracy_desc' then (c.grade_n >= 3) end desc nulls last,
    case when sort_key = 'accuracy_desc' then (c.grade_correct::numeric / nullif(c.grade_n, 0)) end desc nulls last,
    case when sort_key = 'duration_asc' then (c.duration_n >= 3) end desc nulls last,
    case when sort_key = 'duration_asc' then (c.duration_sum::numeric / nullif(c.duration_n, 0)) end asc nulls last,
    case when sort_key = 'duration_desc' then (c.duration_n >= 3) end desc nulls last,
    case when sort_key = 'duration_desc' then (c.duration_sum::numeric / nullif(c.duration_n, 0)) end desc nulls last,
    case when sort_key = 'most_confused' then c.confused_count end desc nulls last,
    c.created_at desc
  limit lim offset off;
end;
$$;

revoke all on function public.discover_problems(text, text, text, integer, text, integer, integer) from public;
grant execute on function public.discover_problems(text, text, text, integer, text, integer, integer) to anon, authenticated;

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
    order by a.user_id, a.submitted_at asc
  ) f;

  use_hour := rec.created_at > now() - interval '48 hours';

  result := jsonb_build_object(
    'problemId', rec.id,
    'authorId', rec.author_id,
    'isAuthor', rec.author_id = p_viewer,
    'difficultyLevel', rec.difficulty_level,
    'solvers', (
      select count(*) from jsonb_array_elements(firsts)
    ),
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
