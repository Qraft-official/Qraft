-- Repair live schema drift against the current problem-answer contract.
-- This migration is intentionally idempotent so it can be re-run safely in a
-- partially migrated Supabase project without breaking existing data.

alter table public.notifications
  add column if not exists link text,
  add column if not exists dedupe_key text;

create unique index if not exists notifications_user_dedupe_idx
  on public.notifications(user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.problems
  add column if not exists answer_type text,
  add column if not exists felt_easy integer not null default 0,
  add column if not exists felt_normal integer not null default 0,
  add column if not exists felt_hard integer not null default 0,
  add column if not exists duration_sum integer not null default 0,
  add column if not exists duration_n integer not null default 0,
  add column if not exists grade_correct integer not null default 0,
  add column if not exists grade_n integer not null default 0,
  add column if not exists series_id uuid,
  add column if not exists series_ord integer;

update public.problems
set answer_type = 'answer'
where answer_type is null;

alter table public.problems
  alter column answer_type set default 'answer',
  alter column answer_type set not null;

alter table public.problems
  add column if not exists answer_options jsonb;

update public.problems
set answer_options = '[]'::jsonb
where answer_options is null;

alter table public.problems
  alter column answer_options set default '[]'::jsonb,
  alter column answer_options set not null;

create table if not exists public.problem_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
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
  on public.problem_attempts(user_id, submitted_at desc)
  where submitted_at is not null;
create index if not exists problem_attempts_problem_idx
  on public.problem_attempts(problem_id)
  where submitted_at is not null;
create unique index if not exists problem_attempts_open_idx
  on public.problem_attempts(user_id, problem_id)
  where submitted_at is null;

alter table public.problem_attempts enable row level security;
drop policy if exists problem_attempts_select_own on public.problem_attempts;
drop policy if exists problem_attempts_insert_own on public.problem_attempts;
drop policy if exists problem_attempts_update_own on public.problem_attempts;
create policy problem_attempts_select_own
  on public.problem_attempts for select to authenticated
  using (user_id = (select auth.uid()));
create policy problem_attempts_insert_own
  on public.problem_attempts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy problem_attempts_update_own
  on public.problem_attempts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update on public.problem_attempts to authenticated;

-- Keep answer_available derived from correct_answer, including on partially
-- migrated databases where it may already exist as an ordinary column.
do $$
declare
  column_exists boolean;
  is_generated boolean;
begin
  select c.is_generated = 'ALWAYS'
    into is_generated
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'problems'
      and c.column_name = 'answer_available';
  column_exists := found;

  if column_exists and not is_generated then
    update public.problems
      set answer_available = (correct_answer is not null);
    alter table public.problems
      drop column answer_available;
    column_exists := false;
  end if;

  if not column_exists then
    alter table public.problems
      add column answer_available boolean generated always as (correct_answer is not null) stored;
  end if;
end $$;

-- Enforce the modern answer contract for existing rows and all future writes.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'problems_answer_type_check'
  ) then
    alter table public.problems
      add constraint problems_answer_type_check
      check (answer_type in ('answer', 'choice', 'written'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'problems_answer_options_array_check'
  ) then
    alter table public.problems
      add constraint problems_answer_options_array_check
      check (jsonb_typeof(answer_options) = 'array');
  end if;
end $$;

create or replace function public.validate_problem_answer_config()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  option_count integer;
  unique_option_count integer;
begin
  if new.answer_type = 'choice' then
    option_count := jsonb_array_length(new.answer_options);
    if option_count < 2 or option_count > 6 then
      raise exception 'CHOICE_OPTIONS_COUNT';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(new.answer_options) as item(value)
      where jsonb_typeof(item.value) <> 'object'
        or length(btrim(coalesce(item.value ->> 'id', ''))) = 0
        or length(btrim(coalesce(item.value ->> 'id', ''))) > 80
        or length(btrim(coalesce(item.value ->> 'text', ''))) = 0
        or length(btrim(coalesce(item.value ->> 'text', ''))) > 500
    ) then
      raise exception 'CHOICE_OPTION_INVALID';
    end if;
    select count(*), count(distinct item.value ->> 'id')
      into option_count, unique_option_count
      from jsonb_array_elements(new.answer_options) as item(value);
    if option_count <> unique_option_count then
      raise exception 'CHOICE_OPTION_IDS_DUPLICATE';
    end if;
    if not exists (
      select 1
      from jsonb_array_elements(new.answer_options) as item(value)
      where item.value ->> 'id' = new.correct_answer
    ) then
      raise exception 'CHOICE_CORRECT_OPTION_REQUIRED';
    end if;
    new.answer_unit := null;
  elsif jsonb_array_length(new.answer_options) > 0 then
    raise exception 'OPTIONS_REQUIRE_CHOICE_TYPE';
  end if;

  if tg_op = 'UPDATE'
    and (
      old.answer_type is distinct from new.answer_type
      or old.answer_options is distinct from new.answer_options
      or old.correct_answer is distinct from new.correct_answer
      or old.answer_unit is distinct from new.answer_unit
    )
    and (
      exists (
        select 1 from public.problem_attempts a
        where a.problem_id = old.id and a.submitted_at is not null
      )
      or exists (
        select 1 from public.problem_written_responses r
        where r.problem_id = old.id
      )
    ) then
    raise exception 'ANSWER_CONFIG_LOCKED';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_problem_answer_config on public.problems;
create trigger trg_validate_problem_answer_config
before insert or update of answer_type, answer_options, correct_answer, answer_unit
on public.problems
for each row execute function public.validate_problem_answer_config();

revoke select on table public.problems from authenticated;
grant select (
  id, author_id, title, problem_text, solution, subject, photo, is_sprint,
  sprint_day, publish_at, topic, pages, problem_format, created_at, mode,
  answer_unit, difficulty_level, confused_count, is_hard_spotlight, promoted,
  promoted_at, hints, felt_easy, felt_normal, felt_hard, duration_sum,
  duration_n, grade_correct, grade_n, series_id, series_ord, answer_type,
  answer_options, answer_available
) on table public.problems to authenticated;

grant select (answer_type, answer_options, answer_available, answer_unit)
  on table public.problems to anon;

create or replace function public.my_problem_answer_keys(p_ids uuid[])
returns table (id uuid, correct_answer text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.correct_answer
  from public.problems p
  where p.author_id = (select auth.uid())
    and p.id = any(coalesce(p_ids, '{}'::uuid[]));
$$;

revoke all on function public.my_problem_answer_keys(uuid[]) from public, anon;
grant execute on function public.my_problem_answer_keys(uuid[]) to authenticated;

create table if not exists public.problem_written_responses (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  responder_id uuid not null references public.profiles(id) on delete cascade,
  answer text not null check (length(btrim(answer)) between 1 and 5000),
  grade text not null default 'pending'
    check (grade in ('pending', 'correct', 'incorrect')),
  grade_comment text check (grade_comment is null or length(grade_comment) <= 500),
  submitted_at timestamptz not null default now(),
  graded_at timestamptz
);

create index if not exists problem_written_responses_problem_idx
  on public.problem_written_responses(problem_id, submitted_at desc);
create index if not exists problem_written_responses_responder_idx
  on public.problem_written_responses(responder_id, submitted_at desc);

alter table public.problem_written_responses enable row level security;

drop policy if exists problem_written_responses_select_participants on public.problem_written_responses;
create policy problem_written_responses_select_participants
  on public.problem_written_responses for select to authenticated
  using (
    responder_id = (select auth.uid())
    or exists (
      select 1 from public.problems p
      where p.id = problem_id and p.author_id = (select auth.uid())
    )
  );

grant select on public.problem_written_responses to authenticated;
revoke insert, update, delete on public.problem_written_responses from anon, authenticated;

create or replace function public.submit_written_response(p_problem_id uuid, p_answer text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  problem_row record;
  response_id uuid;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if length(btrim(coalesce(p_answer, ''))) not between 1 and 5000 then
    raise exception 'ANSWER_REQUIRED';
  end if;
  select p.id, p.author_id, p.title, p.answer_type, p.is_sprint
    into problem_row
    from public.problems p
    where p.id = p_problem_id
      and (p.publish_at is null or p.publish_at <= now());
  if not found or problem_row.is_sprint or problem_row.answer_type <> 'written' then
    raise exception 'PROBLEM_NOT_WRITTEN';
  end if;
  if problem_row.author_id = uid then raise exception 'AUTHOR_CANNOT_ANSWER'; end if;

  insert into public.problem_written_responses(problem_id, responder_id, answer)
  values (p_problem_id, uid, btrim(p_answer))
  returning id into response_id;

  insert into public.notifications(user_id, title, message, link, dedupe_key)
  values (
    problem_row.author_id,
    '新しい記述回答',
    format('あなたの問題「%s」に新しい記述回答が届きました',
      coalesce(nullif(btrim(problem_row.title), ''), '問題')),
    format('/p/%s?response=%s', p_problem_id, response_id),
    'written-response:' || response_id::text || ':submitted'
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return response_id;
end;
$$;

create or replace function public.grade_written_response(
  p_response_id uuid,
  p_grade text,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  response_row record;
  safe_comment text := nullif(left(btrim(coalesce(p_comment, '')), 500), '');
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_grade not in ('correct', 'incorrect') then raise exception 'BAD_GRADE'; end if;
  select r.id, r.problem_id, r.responder_id, r.grade, p.author_id, p.title
    into response_row
    from public.problem_written_responses r
    join public.problems p on p.id = r.problem_id
    where r.id = p_response_id
    for update of r;
  if not found then raise exception 'RESPONSE_NOT_FOUND'; end if;
  if response_row.author_id <> uid then raise exception 'FORBIDDEN'; end if;
  if response_row.grade <> 'pending' then raise exception 'ALREADY_GRADED'; end if;

  update public.problem_written_responses
    set grade = p_grade, grade_comment = safe_comment, graded_at = now()
    where id = p_response_id;

  insert into public.notifications(user_id, title, message, link, dedupe_key)
  values (
    response_row.responder_id,
    case when p_grade = 'correct' then '記述回答が正解と判定されました' else '記述回答が採点されました' end,
    format('「%s」の回答が%s%s',
      coalesce(nullif(btrim(response_row.title), ''), '問題'),
      case when p_grade = 'correct' then '正解と判定されました' else '採点されました' end,
      case when safe_comment is null then '' else format(E'\nコメント: %s', safe_comment) end),
    format('/p/%s?response=%s', response_row.problem_id, p_response_id),
    'written-response:' || p_response_id::text || ':graded'
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end;
$$;

revoke all on function public.submit_written_response(uuid, text) from public, anon;
revoke all on function public.grade_written_response(uuid, text, text) from public, anon;
grant execute on function public.submit_written_response(uuid, text) to authenticated;
grant execute on function public.grade_written_response(uuid, text, text) to authenticated;

create table if not exists public.problem_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 100),
  description text check (description is null or length(description) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists problem_sets_owner_updated_idx
  on public.problem_sets(owner_id, updated_at desc);

create table if not exists public.problem_set_items (
  problem_set_id uuid not null references public.problem_sets(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (problem_set_id, problem_id)
);

create index if not exists problem_set_items_order_idx
  on public.problem_set_items(problem_set_id, position, created_at);

alter table public.problem_sets enable row level security;
alter table public.problem_set_items enable row level security;

drop policy if exists problem_sets_select_own on public.problem_sets;
drop policy if exists problem_sets_insert_own on public.problem_sets;
drop policy if exists problem_sets_update_own on public.problem_sets;
drop policy if exists problem_sets_delete_own on public.problem_sets;

drop policy if exists problem_set_items_select_own on public.problem_set_items;
drop policy if exists problem_set_items_insert_own_public_problem on public.problem_set_items;
drop policy if exists problem_set_items_update_own on public.problem_set_items;
drop policy if exists problem_set_items_delete_own on public.problem_set_items;

create policy problem_sets_select_own
  on public.problem_sets for select to authenticated
  using (owner_id = (select auth.uid()));
create policy problem_sets_insert_own
  on public.problem_sets for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy problem_sets_update_own
  on public.problem_sets for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy problem_sets_delete_own
  on public.problem_sets for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy problem_set_items_select_own
  on public.problem_set_items for select to authenticated
  using (exists (
    select 1 from public.problem_sets s
    where s.id = problem_set_id and s.owner_id = (select auth.uid())
  ));
create policy problem_set_items_insert_own_public_problem
  on public.problem_set_items for insert to authenticated
  with check (
    exists (
      select 1 from public.problem_sets s
      where s.id = problem_set_id and s.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.problems p
      where p.id = problem_id and not p.is_sprint
        and (p.publish_at is null or p.publish_at <= now())
    )
  );
create policy problem_set_items_update_own
  on public.problem_set_items for update to authenticated
  using (exists (
    select 1 from public.problem_sets s
    where s.id = problem_set_id and s.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.problem_sets s
    where s.id = problem_set_id and s.owner_id = (select auth.uid())
  ));
create policy problem_set_items_delete_own
  on public.problem_set_items for delete to authenticated
  using (exists (
    select 1 from public.problem_sets s
    where s.id = problem_set_id and s.owner_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.problem_sets to authenticated;
grant select, insert, update, delete on public.problem_set_items to authenticated;

create or replace function public.touch_problem_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.problem_sets
    set updated_at = now()
    where id = coalesce(new.problem_set_id, old.problem_set_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_touch_problem_set_updated_at on public.problem_set_items;
create trigger trg_touch_problem_set_updated_at
after insert or update or delete on public.problem_set_items
for each row execute function public.touch_problem_set_updated_at();
