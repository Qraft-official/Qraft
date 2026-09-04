-- Learning features: save, attempts, hints, felt difficulty, series,
-- per-author problem notifications, and learning calendar.
-- Does not change Aha / star ratings / weekly highlights / referral login streak.

alter table public.notifications
  add column if not exists link text,
  add column if not exists dedupe_key text;

create unique index if not exists notifications_user_dedupe_idx
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.problems
  add column if not exists hints jsonb not null default '[]'::jsonb,
  add column if not exists felt_easy integer not null default 0,
  add column if not exists felt_normal integer not null default 0,
  add column if not exists felt_hard integer not null default 0,
  add column if not exists duration_sum integer not null default 0,
  add column if not exists duration_n integer not null default 0,
  add column if not exists grade_correct integer not null default 0,
  add column if not exists grade_n integer not null default 0,
  add column if not exists series_id uuid,
  add column if not exists series_ord integer;

-- ---------------------------------------------------------------------------
-- saved_problems
-- ---------------------------------------------------------------------------
create table if not exists public.saved_problems (
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  category text not null default 'later'
    check (category in ('later', 'exam', 'hard')),
  created_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

create index if not exists saved_problems_user_created_idx
  on public.saved_problems (user_id, created_at desc);

alter table public.saved_problems enable row level security;

drop policy if exists "saved_problems_select_own" on public.saved_problems;
create policy "saved_problems_select_own"
  on public.saved_problems for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "saved_problems_insert_own" on public.saved_problems;
create policy "saved_problems_insert_own"
  on public.saved_problems for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "saved_problems_update_own" on public.saved_problems;
create policy "saved_problems_update_own"
  on public.saved_problems for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "saved_problems_delete_own" on public.saved_problems;
create policy "saved_problems_delete_own"
  on public.saved_problems for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.saved_problems to authenticated;

-- ---------------------------------------------------------------------------
-- problem_attempts
-- ---------------------------------------------------------------------------
create table if not exists public.problem_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  started_at timestamptz,
  submitted_at timestamptz,
  duration_seconds integer,
  grade text check (grade is null or grade in ('correct', 'incorrect', 'ungraded')),
  solver_answer text,
  is_revenge boolean not null default false,
  revenge_available_at timestamptz,
  revenge_completed_at timestamptz,
  revenge_prompted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists problem_attempts_user_submitted_idx
  on public.problem_attempts (user_id, submitted_at desc)
  where submitted_at is not null;

create index if not exists problem_attempts_problem_idx
  on public.problem_attempts (problem_id)
  where submitted_at is not null;

create unique index if not exists problem_attempts_open_idx
  on public.problem_attempts (user_id, problem_id)
  where submitted_at is null;

alter table public.problem_attempts enable row level security;

drop policy if exists "problem_attempts_select_own" on public.problem_attempts;
create policy "problem_attempts_select_own"
  on public.problem_attempts for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "problem_attempts_insert_own" on public.problem_attempts;
create policy "problem_attempts_insert_own"
  on public.problem_attempts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "problem_attempts_update_own" on public.problem_attempts;
create policy "problem_attempts_update_own"
  on public.problem_attempts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.problem_attempts to authenticated;

-- ---------------------------------------------------------------------------
-- difficulty_votes (felt difficulty; not Aha / star ratings)
-- ---------------------------------------------------------------------------
create table if not exists public.difficulty_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  vote smallint not null check (vote in (1, 2, 3)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

alter table public.difficulty_votes enable row level security;

drop policy if exists "difficulty_votes_select_own" on public.difficulty_votes;
create policy "difficulty_votes_select_own"
  on public.difficulty_votes for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "difficulty_votes_insert_own" on public.difficulty_votes;
create policy "difficulty_votes_insert_own"
  on public.difficulty_votes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "difficulty_votes_update_own" on public.difficulty_votes;
create policy "difficulty_votes_update_own"
  on public.difficulty_votes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "difficulty_votes_delete_own" on public.difficulty_votes;
create policy "difficulty_votes_delete_own"
  on public.difficulty_votes for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.difficulty_votes to authenticated;

create or replace function public.sync_felt_difficulty_counts()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  pid uuid;
begin
  pid := coalesce(new.problem_id, old.problem_id);
  update public.problems p
  set
    felt_easy = (select count(*) from public.difficulty_votes v where v.problem_id = pid and v.vote = 1),
    felt_normal = (select count(*) from public.difficulty_votes v where v.problem_id = pid and v.vote = 2),
    felt_hard = (select count(*) from public.difficulty_votes v where v.problem_id = pid and v.vote = 3)
  where p.id = pid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_felt_difficulty on public.difficulty_votes;
create trigger trg_sync_felt_difficulty
after insert or update or delete on public.difficulty_votes
for each row
execute function public.sync_felt_difficulty_counts();

-- ---------------------------------------------------------------------------
-- problem_series
-- ---------------------------------------------------------------------------
create table if not exists public.problem_series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists problem_series_owner_idx
  on public.problem_series (owner_id, created_at desc);

alter table public.problem_series enable row level security;

drop policy if exists "problem_series_select_all" on public.problem_series;
create policy "problem_series_select_all"
  on public.problem_series for select
  to anon, authenticated
  using (true);

drop policy if exists "problem_series_insert_own" on public.problem_series;
create policy "problem_series_insert_own"
  on public.problem_series for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "problem_series_update_own" on public.problem_series;
create policy "problem_series_update_own"
  on public.problem_series for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "problem_series_delete_own" on public.problem_series;
create policy "problem_series_delete_own"
  on public.problem_series for delete
  to authenticated
  using (owner_id = (select auth.uid()));

grant select on public.problem_series to anon, authenticated;
grant insert, update, delete on public.problem_series to authenticated;

alter table public.problems
  drop constraint if exists problems_series_id_fkey;
alter table public.problems
  add constraint problems_series_id_fkey
  foreign key (series_id) references public.problem_series (id) on delete set null;

create index if not exists problems_series_ord_idx
  on public.problems (series_id, series_ord)
  where series_id is not null;

-- ---------------------------------------------------------------------------
-- user_post_notifications (default off; follow-based in app)
-- ---------------------------------------------------------------------------
create table if not exists public.user_post_notifications (
  subscriber_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, author_id),
  check (subscriber_id <> author_id)
);

alter table public.user_post_notifications enable row level security;

drop policy if exists "user_post_notifications_select_own" on public.user_post_notifications;
create policy "user_post_notifications_select_own"
  on public.user_post_notifications for select
  to authenticated
  using (subscriber_id = (select auth.uid()));

drop policy if exists "user_post_notifications_insert_own" on public.user_post_notifications;
create policy "user_post_notifications_insert_own"
  on public.user_post_notifications for insert
  to authenticated
  with check (subscriber_id = (select auth.uid()) and subscriber_id <> author_id);

drop policy if exists "user_post_notifications_delete_own" on public.user_post_notifications;
create policy "user_post_notifications_delete_own"
  on public.user_post_notifications for delete
  to authenticated
  using (subscriber_id = (select auth.uid()));

grant select, insert, delete on public.user_post_notifications to authenticated;

-- ---------------------------------------------------------------------------
-- learning_activity (distinct from Welcome Mission login_streak)
-- ---------------------------------------------------------------------------
create table if not exists public.learning_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('solve', 'post', 'pulse')),
  problem_id uuid references public.problems (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists learning_activity_user_day_idx
  on public.learning_activity (user_id, created_at desc);

alter table public.learning_activity enable row level security;

drop policy if exists "learning_activity_select_own" on public.learning_activity;
create policy "learning_activity_select_own"
  on public.learning_activity for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "learning_activity_insert_own" on public.learning_activity;
create policy "learning_activity_insert_own"
  on public.learning_activity for insert
  to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert on public.learning_activity to authenticated;

-- ---------------------------------------------------------------------------
-- triggers
-- ---------------------------------------------------------------------------
create or replace function public.record_learning_activity(p_user uuid, p_kind text, p_problem uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_user is null then
    return;
  end if;
  insert into public.learning_activity (user_id, kind, problem_id)
  values (p_user, p_kind, p_problem);
end;
$$;

create or replace function public.on_problem_inserted_learning()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  author_handle text;
begin
  perform public.record_learning_activity(
    new.author_id,
    case when new.is_sprint then 'pulse' else 'post' end,
    new.id
  );

  select coalesce(nullif(pr.handle, ''), 'qrafter') into author_handle
  from public.profiles pr
  where pr.id = new.author_id;

  insert into public.notifications (user_id, title, message, link, dedupe_key)
  select
    n.subscriber_id,
    '新着問題',
    '@' || coalesce(author_handle, 'qrafter') || ' が新しい問題を投稿しました',
    '/p/' || new.id::text,
    'newpost:' || new.id::text
  from public.user_post_notifications n
  where n.author_id = new.author_id
    and n.subscriber_id <> new.author_id
  on conflict (user_id, dedupe_key) where (dedupe_key is not null) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_on_problem_inserted_learning on public.problems;
create trigger trg_on_problem_inserted_learning
after insert on public.problems
for each row
execute function public.on_problem_inserted_learning();

create or replace function public.on_attempt_before_submit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.submitted_at is not null
     and new.grade = 'incorrect'
     and new.revenge_available_at is null then
    new.revenge_available_at := coalesce(new.submitted_at, now()) + interval '3 days';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_on_attempt_submitted on public.problem_attempts;
drop trigger if exists trg_on_attempt_before_submit on public.problem_attempts;
create trigger trg_on_attempt_before_submit
before insert or update on public.problem_attempts
for each row
execute function public.on_attempt_before_submit();

-- BEFORE INSERT submitted attempts (direct submit without open row)
create or replace function public.on_attempt_after_submit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  is_pulse boolean := false;
  dur integer;
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

  dur := new.duration_seconds;
  if dur is not null and dur >= 15 and dur <= 7200 then
    update public.problems
    set duration_sum = duration_sum + dur,
        duration_n = duration_n + 1
    where id = new.problem_id;
  end if;

  if new.grade in ('correct', 'incorrect') then
    update public.problems
    set
      grade_n = grade_n + 1,
      grade_correct = grade_correct + case when new.grade = 'correct' then 1 else 0 end
    where id = new.problem_id;
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

drop trigger if exists trg_on_attempt_inserted_after on public.problem_attempts;
drop trigger if exists trg_on_attempt_after_submit on public.problem_attempts;
create trigger trg_on_attempt_after_submit
after insert or update on public.problem_attempts
for each row
execute function public.on_attempt_after_submit();

-- ---------------------------------------------------------------------------
-- RPCs (batch; no N+1 from PostCard)
-- ---------------------------------------------------------------------------
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
        'revengeCompletedAt', a.revenge_completed_at
      ))
      from (
        select distinct on (problem_id)
          problem_id, grade, duration_seconds, submitted_at, is_revenge,
          revenge_available_at, revenge_completed_at
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

create or replace function public.learning_bootstrap()
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'public'
as $$
declare
  uid uuid := (select auth.uid());
  days date[];
  current_streak int := 0;
  longest_streak int := 0;
  run int := 0;
  prev date;
  d date;
begin
  if uid is null then
    return '{}'::jsonb;
  end if;

  select coalesce(array_agg(day order by day desc), '{}') into days
  from (
    select distinct (created_at at time zone 'Asia/Tokyo')::date as day
    from public.learning_activity
    where user_id = uid
      and created_at > now() - interval '400 days'
  ) q;

  foreach d in array days loop
    if prev is null then
      run := 1;
    elsif prev = d + 1 then
      run := run + 1;
    else
      run := 1;
    end if;
    if run > longest_streak then
      longest_streak := run;
    end if;
    prev := d;
  end loop;

  if array_length(days, 1) is not null then
    if days[1] = (timezone('Asia/Tokyo', now()))::date
       or days[1] = (timezone('Asia/Tokyo', now()))::date - 1 then
      current_streak := 0;
      prev := null;
      foreach d in array days loop
        if prev is null then
          if d = (timezone('Asia/Tokyo', now()))::date
             or d = (timezone('Asia/Tokyo', now()))::date - 1 then
            current_streak := 1;
            prev := d;
          else
            exit;
          end if;
        elsif prev = d + 1 then
          current_streak := current_streak + 1;
          prev := d;
        else
          exit;
        end if;
      end loop;
    end if;
  end if;

  return jsonb_build_object(
    'notifyAuthors', coalesce((
      select jsonb_agg(author_id)
      from public.user_post_notifications
      where subscriber_id = uid
    ), '[]'::jsonb),
    'revenge', coalesce((
      select jsonb_agg(jsonb_build_object(
        'problemId', x.problem_id,
        'submittedAt', x.submitted_at,
        'revengeAvailableAt', x.revenge_available_at
      ))
      from (
        select distinct on (a.problem_id)
          a.problem_id, a.submitted_at, a.revenge_available_at
        from public.problem_attempts a
        where a.user_id = uid
          and a.grade = 'incorrect'
          and a.revenge_completed_at is null
          and a.revenge_available_at is not null
          and a.revenge_available_at <= now()
        order by a.problem_id, a.submitted_at desc
        limit 5
      ) x
    ), '[]'::jsonb),
    'calendarDays', coalesce((
      select jsonb_agg(day)
      from (
        select distinct (created_at at time zone 'Asia/Tokyo')::date as day
        from public.learning_activity
        where user_id = uid
          and created_at > now() - interval '120 days'
        order by 1
      ) c
    ), '[]'::jsonb),
    'currentStreak', current_streak,
    'longestStreak', longest_streak
  );
end;
$$;

revoke all on function public.learning_bootstrap() from public, anon;
grant execute on function public.learning_bootstrap() to authenticated;

create or replace function public.prompt_due_revenge()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  n int := 0;
begin
  if uid is null then
    return 0;
  end if;
  insert into public.notifications (user_id, title, message, link, dedupe_key)
  select
    uid,
    'リベンジ',
    '数日前に間違えた問題、もう一度解く？',
    '/p/' || a.problem_id::text,
    'revenge:' || a.problem_id::text
  from (
    select distinct on (problem_id) problem_id, submitted_at
    from public.problem_attempts
    where user_id = uid
      and grade = 'incorrect'
      and revenge_completed_at is null
      and revenge_available_at is not null
      and revenge_available_at <= now()
      and revenge_prompted_at is null
    order by problem_id, submitted_at desc
  ) a
  on conflict (user_id, dedupe_key) where (dedupe_key is not null) do nothing;

  get diagnostics n = row_count;

  update public.problem_attempts t
  set revenge_prompted_at = now()
  where t.user_id = uid
    and t.grade = 'incorrect'
    and t.revenge_completed_at is null
    and t.revenge_available_at <= now()
    and t.revenge_prompted_at is null;

  return n;
end;
$$;

revoke all on function public.prompt_due_revenge() from public, anon;
grant execute on function public.prompt_due_revenge() to authenticated;
