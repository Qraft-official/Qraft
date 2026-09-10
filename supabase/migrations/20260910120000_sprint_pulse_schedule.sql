-- Daily 21:00 JST PULSE (Mode A). Reuses problems.is_sprint, sprint_day, publish_at.
-- Secrets live in sprint_secrets (not selectable by clients).

create or replace function public.sprint_opens_at(p_day date)
returns timestamptz
language sql
immutable
set search_path to 'public'
as $$
  select (p_day::timestamp + time '21:00') at time zone 'Asia/Tokyo'
$$;

create or replace function public.sprint_closes_at(p_day date)
returns timestamptz
language sql
immutable
set search_path to 'public'
as $$
  select public.sprint_opens_at(p_day) + interval '10 minutes'
$$;

create or replace function public.jst_today()
returns date
language sql
stable
set search_path to 'public'
as $$
  select (timezone('Asia/Tokyo', now()))::date
$$;

alter table public.problems
  add column if not exists topic text;

alter table public.problems
  add column if not exists publish_at timestamptz not null default now();

create unique index if not exists problems_sprint_day_unique
  on public.problems (sprint_day)
  where is_sprint and sprint_day is not null;

create or replace function public.sync_sprint_publish_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.is_sprint then
    if new.sprint_day is null then
      raise exception 'SPRINT_DAY_REQUIRED';
    end if;
    new.publish_at := public.sprint_opens_at(new.sprint_day);
    new.correct_answer := null;
    new.solution := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_sprint_publish_at on public.problems;
create trigger trg_sync_sprint_publish_at
before insert or update of is_sprint, sprint_day
on public.problems
for each row
execute function public.sync_sprint_publish_at();

create table if not exists public.sprint_secrets (
  problem_id uuid primary key references public.problems (id) on delete cascade,
  correct_answer text,
  explanation text,
  hint text,
  updated_at timestamptz not null default now()
);

alter table public.sprint_secrets enable row level security;
revoke all on public.sprint_secrets from public, anon, authenticated;

create table if not exists public.sprint_attempts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  solver_answer text,
  primary key (user_id, problem_id)
);

create index if not exists sprint_attempts_problem_idx
  on public.sprint_attempts (problem_id, submitted_at);

alter table public.sprint_attempts enable row level security;

create or replace function public.viewer_sprint_unlocked(p_problem_id uuid)
returns boolean
language sql
stable
security invoker
set search_path to 'public'
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.sprint_attempts a
      where a.problem_id = p_problem_id
        and a.user_id = (select auth.uid())
    )
$$;

revoke all on function public.viewer_sprint_unlocked(uuid) from public, anon;
grant execute on function public.viewer_sprint_unlocked(uuid) to authenticated;

drop policy if exists "sprint_attempts_select" on public.sprint_attempts;
create policy "sprint_attempts_select"
  on public.sprint_attempts for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.viewer_sprint_unlocked(problem_id)
  );

drop policy if exists "sprint_attempts_insert_own" on public.sprint_attempts;
create policy "sprint_attempts_insert_own"
  on public.sprint_attempts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "sprint_attempts_update_own" on public.sprint_attempts;
create policy "sprint_attempts_update_own"
  on public.sprint_attempts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.sprint_attempts to authenticated;
revoke all on public.sprint_attempts from anon;

drop policy if exists "problems are readable" on public.problems;
create policy "problems are readable"
  on public.problems for select
  to anon, authenticated
  using (
    (not is_sprint)
    or public.is_admin()
    or (sprint_day is not null and now() >= publish_at)
  );

drop policy if exists "users can insert own problems" on public.problems;
create policy "users can insert own problems"
  on public.problems for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      not is_sprint
      or public.is_admin()
    )
  );

drop policy if exists "comments are readable" on public.comments;
create policy "comments are readable"
  on public.comments for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.problems p
      where p.id = comments.post_id
        and (
          not p.is_sprint
          or public.is_admin()
          or (
            now() >= p.publish_at
            and public.viewer_sprint_unlocked(p.id)
          )
        )
    )
  );

drop policy if exists "users can insert own comments" on public.comments;
create policy "users can insert own comments"
  on public.comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.problems p
      where p.id = comments.post_id
        and (
          not p.is_sprint
          or public.viewer_sprint_unlocked(p.id)
        )
    )
  );

create or replace function public.sprint_teaser()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  today date := public.jst_today();
  rec record;
begin
  select p.sprint_day, p.publish_at
    into rec
  from public.problems p
  where p.is_sprint
    and p.sprint_day = today
  limit 1;

  if rec.sprint_day is null then
    return jsonb_build_object(
      'scheduled', false,
      'day', today,
      'opensAt', public.sprint_opens_at(today),
      'closesAt', public.sprint_closes_at(today)
    );
  end if;

  return jsonb_build_object(
    'scheduled', true,
    'day', rec.sprint_day,
    'opensAt', rec.publish_at,
    'closesAt', rec.publish_at + interval '10 minutes',
    'published', now() >= rec.publish_at
  );
end;
$$;

revoke all on function public.sprint_teaser() from public;
grant execute on function public.sprint_teaser() to anon, authenticated;

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
  if now() > rec.publish_at + interval '10 minutes' then
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

revoke all on function public.submit_sprint_attempt(uuid, text) from public, anon;
grant execute on function public.submit_sprint_attempt(uuid, text) to authenticated;

create or replace function public.sprint_reveal(p_problem_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  rec record;
begin
  if not public.viewer_sprint_unlocked(p_problem_id) then
    raise exception 'LOCKED';
  end if;

  select s.hint, s.explanation, s.correct_answer
    into rec
  from public.sprint_secrets s
  where s.problem_id = p_problem_id;

  if rec is null then
    return jsonb_build_object('hint', null, 'explanation', null, 'correctAnswer', null);
  end if;

  return jsonb_build_object(
    'hint', rec.hint,
    'explanation', rec.explanation,
    'correctAnswer', rec.correct_answer
  );
end;
$$;

revoke all on function public.sprint_reveal(uuid) from public, anon;
grant execute on function public.sprint_reveal(uuid) to authenticated;
