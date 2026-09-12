-- Launch sample accounts + list regular posts only after publish_at.
-- Does not truncate or rewrite existing user/PULSE rows.

alter table public.profiles
  add column if not exists is_sample boolean not null default false;

alter table public.problems
  add column if not exists seed_key text;

create unique index if not exists problems_seed_key_uidx
  on public.problems (seed_key)
  where seed_key is not null;

create index if not exists profiles_is_sample_idx
  on public.profiles (id)
  where is_sample;

-- Listed when publish_at is null (legacy) or due. Unpublished sprints stay
-- admin-only, matching the existing PULSE policy. Admins do not see future
-- non-sprint (sample) posts on public feeds.
drop policy if exists "problems are readable" on public.problems;
create policy "problems are readable"
  on public.problems for select
  to anon, authenticated
  using (
    (
      not coalesce(is_sprint, false)
      and (publish_at is null or now() >= publish_at)
    )
    or (
      coalesce(is_sprint, false)
      and sprint_day is not null
      and publish_at is not null
      and now() >= publish_at
    )
    or (
      coalesce(is_sprint, false)
      and public.is_admin()
    )
  );

create or replace function public.weekly_highlights()
returns jsonb
language sql
stable
security invoker
set search_path to 'public'
as $$
  with since as (
    select (now() - interval '7 days') as t
  ),
  rx as (
    select r.problem_id, count(*)::int as n
    from public.problem_reactions r
    join public.problems p on p.id = r.problem_id
    join public.profiles pr on pr.id = p.author_id
    cross join since
    where r.created_at >= since.t
      and not coalesce(pr.is_sample, false)
      and not coalesce(p.is_sprint, false)
    group by r.problem_id
  ),
  by_author as (
    select p.author_id, coalesce(sum(rx.n), 0)::int as n
    from rx
    join public.problems p on p.id = rx.problem_id
    join public.profiles pr on pr.id = p.author_id
    where not coalesce(pr.is_sample, false)
    group by p.author_id
  ),
  qrafter as (
    select pr.id, pr.name, pr.handle, ba.n as weekly_reactions
    from by_author ba
    join public.profiles pr on pr.id = ba.author_id
    where not coalesce(pr.is_sample, false)
    order by ba.n desc
    limit 1
  ),
  question as (
    select
      p.id,
      p.author_id,
      p.title,
      p.problem_text,
      p.pages,
      p.created_at,
      p.confused_count,
      (coalesce(rx.n, 0) + coalesce(p.confused_count, 0))::int as score
    from public.problems p
    join public.profiles pr on pr.id = p.author_id
    left join rx on rx.problem_id = p.id
    cross join since
    where p.created_at >= since.t
      and not coalesce(p.is_sprint, false)
      and not coalesce(pr.is_sample, false)
      and (p.publish_at is null or p.publish_at <= now())
    order by score desc, p.created_at desc
    limit 1
  )
  select jsonb_build_object(
    'since', (select t from since),
    'qrafter', (select to_jsonb(qrafter) from qrafter),
    'question', (select to_jsonb(question) from question),
    'by_problem', coalesce((select jsonb_object_agg(problem_id::text, n) from rx), '{}'::jsonb),
    'by_author', coalesce((select jsonb_object_agg(author_id::text, n) from by_author), '{}'::jsonb)
  );
$$;

-- Do not ping followers for unpublished scheduled posts (sample launch window).
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

  if new.publish_at is not null and new.publish_at > now() then
    return new;
  end if;

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

-- Comments inherit problem visibility (unpublished rows fail the EXISTS via RLS).
drop policy if exists "comments are readable" on public.comments;
create policy "comments are readable"
  on public.comments for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.problems p
      where p.id = comments.post_id
    )
  );
