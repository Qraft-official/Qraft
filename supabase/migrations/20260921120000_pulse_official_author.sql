-- Official @qraft account for PULSE, author reassignment, and admin upsert author.
-- Does not change PULSE titles, bodies, secrets, answers, photos, or sprint_day.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.pulse_official_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select id
  from public.profiles
  where lower(coalesce(handle, '')) = 'qraft'
  order by created_at asc
  limit 1
$$;

revoke all on function public.pulse_official_id() from public, anon;
grant execute on function public.pulse_official_id() to authenticated;

do $$
declare
  uid uuid;
  inst uuid := '00000000-0000-0000-0000-000000000000';
begin
  select id into uid from public.profiles where lower(coalesce(handle, '')) = 'qraft' limit 1;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, is_anonymous
    ) values (
      inst,
      uid,
      'authenticated',
      'authenticated',
      'official@qrafters.jp',
      extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Qraft","handle":"qraft"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      '',
      false
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      uid,
      jsonb_build_object('sub', uid::text, 'email', 'official@qrafters.jp', 'email_verified', true),
      'email',
      uid::text,
      now(),
      now(),
      now()
    );
    insert into public.profiles (id, name, handle, onboarded)
    values (uid, 'Qraft', 'qraft', true)
    on conflict (id) do update
      set name = 'Qraft',
          handle = coalesce(public.profiles.handle, 'qraft');
  else
    update public.profiles
    set name = 'Qraft',
        handle = 'qraft'
    where id = uid;
  end if;
end $$;

update public.problems p
set author_id = public.pulse_official_id()
where p.is_sprint
  and public.pulse_official_id() is not null
  and p.author_id is distinct from public.pulse_official_id();

update public.problems p
set publish_at = public.sprint_opens_at(p.sprint_day)
where p.is_sprint
  and p.sprint_day is not null
  and p.publish_at is distinct from public.sprint_opens_at(p.sprint_day);

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
as $function$
declare
  actor uuid := auth.uid();
  official uuid := public.pulse_official_id();
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
  if official is null then
    raise exception 'OFFICIAL_PROFILE_MISSING';
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
      mode = 'aha',
      author_id = official
    where id = p_id;
    pid := p_id;
  else
    insert into public.problems (
      author_id, title, problem_text, subject, topic, difficulty_level,
      is_sprint, sprint_day, mode, solution, correct_answer
    ) values (
      official,
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
$function$;
