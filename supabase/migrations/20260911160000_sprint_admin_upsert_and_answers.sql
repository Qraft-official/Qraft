-- Sprint admin atomic upsert + answer metadata. Does not drop data.
-- Does not add problems.hints.

alter table public.sprint_secrets
  add column if not exists answer_type text not null default 'number';

alter table public.sprint_secrets
  drop constraint if exists sprint_secrets_answer_type_check;

alter table public.sprint_secrets
  add constraint sprint_secrets_answer_type_check
  check (answer_type in ('number', 'expression', 'text', 'choice', 'multiple'));

alter table public.sprint_secrets
  add column if not exists accepted_answers jsonb not null default '[]'::jsonb;

alter table public.sprint_attempts
  add column if not exists grade text;

alter table public.sprint_attempts
  drop constraint if exists sprint_attempts_grade_check;

alter table public.sprint_attempts
  add constraint sprint_attempts_grade_check
  check (grade is null or grade in ('correct', 'maybe_correct', 'incorrect'));

create or replace function public.admin_upsert_sprint_problem(
  p_sprint_day date,
  p_title text,
  p_problem_text text,
  p_subject text,
  p_topic text,
  p_difficulty smallint,
  p_correct_answer text,
  p_hint text default null,
  p_explanation text default null,
  p_answer_type text default 'number',
  p_accepted_answers jsonb default '[]'::jsonb,
  p_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  actor uuid := auth.uid();
  pid uuid;
  rec record;
  atype text := coalesce(nullif(btrim(p_answer_type), ''), 'number');
begin
  if actor is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_sprint_day is null then
    raise exception 'SPRINT_DAY_REQUIRED';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception 'TITLE_REQUIRED';
  end if;
  if p_problem_text is null or btrim(p_problem_text) = '' then
    raise exception 'TEXT_REQUIRED';
  end if;
  if p_correct_answer is null or btrim(p_correct_answer) = '' then
    raise exception 'ANSWER_REQUIRED';
  end if;
  if p_subject not in ('math', 'physics', 'chemistry') then
    raise exception 'BAD_SUBJECT';
  end if;
  if atype not in ('number', 'expression', 'text', 'choice', 'multiple') then
    raise exception 'BAD_ANSWER_TYPE';
  end if;

  if p_id is not null then
    select id, publish_at into rec
    from public.problems
    where id = p_id and is_sprint
    limit 1;
    if rec.id is null then
      raise exception 'NOT_FOUND';
    end if;
    if rec.publish_at is not null and now() >= rec.publish_at then
      raise exception 'ALREADY_LIVE';
    end if;
    update public.problems
    set
      title = btrim(p_title),
      problem_text = p_problem_text,
      subject = p_subject,
      topic = nullif(btrim(coalesce(p_topic, '')), ''),
      difficulty_level = coalesce(p_difficulty, 3),
      sprint_day = p_sprint_day,
      mode = 'aha'
    where id = p_id;
    pid := p_id;
  else
    insert into public.problems (
      author_id, title, problem_text, subject, topic, difficulty_level,
      is_sprint, sprint_day, mode, solution, correct_answer
    ) values (
      actor,
      btrim(p_title),
      p_problem_text,
      p_subject,
      nullif(btrim(coalesce(p_topic, '')), ''),
      coalesce(p_difficulty, 3),
      true,
      p_sprint_day,
      'aha',
      null,
      null
    )
    returning id into pid;
  end if;

  insert into public.sprint_secrets (
    problem_id, correct_answer, hint, explanation, answer_type, accepted_answers, updated_at
  ) values (
    pid,
    btrim(p_correct_answer),
    nullif(btrim(coalesce(p_hint, '')), ''),
    nullif(btrim(coalesce(p_explanation, '')), ''),
    atype,
    coalesce(p_accepted_answers, '[]'::jsonb),
    now()
  )
  on conflict (problem_id) do update set
    correct_answer = excluded.correct_answer,
    hint = excluded.hint,
    explanation = excluded.explanation,
    answer_type = excluded.answer_type,
    accepted_answers = excluded.accepted_answers,
    updated_at = now();

  select id, sprint_day, publish_at into rec
  from public.problems
  where id = pid;

  return jsonb_build_object(
    'ok', true,
    'id', rec.id,
    'sprintDay', rec.sprint_day,
    'publishAt', rec.publish_at
  );
exception
  when unique_violation then
    raise exception 'DAY_TAKEN';
end;
$$;

create or replace function public.admin_delete_sprint_problem(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  rec record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  select id, publish_at into rec
  from public.problems
  where id = p_id and is_sprint
  limit 1;
  if rec.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if rec.publish_at is not null and now() >= rec.publish_at then
    raise exception 'ALREADY_LIVE';
  end if;
  delete from public.problems where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_sprint_secrets()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  return coalesce(
    (
      select jsonb_agg(to_jsonb(s) order by s.updated_at desc)
      from public.sprint_secrets s
      join public.problems p on p.id = s.problem_id
      where p.is_sprint
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.admin_upsert_sprint_problem(date, text, text, text, text, smallint, text, text, text, text, jsonb, uuid) from public, anon;
revoke all on function public.admin_delete_sprint_problem(uuid) from public, anon;
revoke all on function public.admin_sprint_secrets() from public, anon;
grant execute on function public.admin_upsert_sprint_problem(date, text, text, text, text, smallint, text, text, text, text, jsonb, uuid) to authenticated;
grant execute on function public.admin_delete_sprint_problem(uuid) to authenticated;
grant execute on function public.admin_sprint_secrets() to authenticated;
