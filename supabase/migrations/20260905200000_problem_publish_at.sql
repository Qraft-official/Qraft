-- Scheduled visibility for posts. Existing rows keep their created_at as publish_at.
-- Future publish_at is hidden by RLS (publish_at <= now()), not by the client.

alter table public.problems
  add column if not exists publish_at timestamptz;

update public.problems
set publish_at = created_at
where publish_at is null;

alter table public.problems
  alter column publish_at set default now();

alter table public.problems
  alter column publish_at set not null;

create index if not exists problems_publish_at_idx
  on public.problems (publish_at desc);

create table if not exists public.launch_seed_map (
  seed_key text primary key,
  kind text not null check (kind in ('user', 'problem')),
  entity_id uuid not null,
  created_at timestamptz not null default now()
);

create unique index if not exists launch_seed_map_kind_entity_uidx
  on public.launch_seed_map (kind, entity_id);

alter table public.launch_seed_map enable row level security;
revoke all on public.launch_seed_map from public, anon, authenticated;

create or replace function public.guard_problem_publish_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.publish_at is null then
      new.publish_at := now();
    end if;
    if coalesce(auth.role(), '') in ('authenticated', 'anon') then
      new.publish_at := now();
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if coalesce(auth.role(), '') in ('authenticated', 'anon') then
      new.publish_at := old.publish_at;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_problem_publish_at on public.problems;
create trigger trg_guard_problem_publish_at
before insert or update on public.problems
for each row
execute function public.guard_problem_publish_at();

drop policy if exists "problems are readable" on public.problems;
create policy "problems are readable"
  on public.problems for select
  to anon, authenticated
  using (
    publish_at <= now()
    or author_id = (select auth.uid())
    or public.is_admin()
  );

create or replace function public.weekly_highlights()
returns jsonb
language sql
stable
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
      and p.publish_at <= now()
      and not coalesce((to_jsonb(pr)->>'is_sample')::boolean, false)
    group by r.problem_id
  ),
  by_author as (
    select p.author_id, coalesce(sum(rx.n), 0)::int as n
    from rx
    join public.problems p on p.id = rx.problem_id
    join public.profiles pr on pr.id = p.author_id
    where not coalesce((to_jsonb(pr)->>'is_sample')::boolean, false)
    group by p.author_id
  ),
  qrafter as (
    select pr.id, pr.name, pr.handle, ba.n as weekly_reactions
    from by_author ba
    join public.profiles pr on pr.id = ba.author_id
    where not coalesce((to_jsonb(pr)->>'is_sample')::boolean, false)
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
      p.publish_at,
      p.confused_count,
      (coalesce(rx.n, 0) + coalesce(p.confused_count, 0))::int as score
    from public.problems p
    join public.profiles pr on pr.id = p.author_id
    left join rx on rx.problem_id = p.id
    cross join since
    where p.publish_at >= since.t
      and p.publish_at <= now()
      and not coalesce(p.is_sprint, false)
      and not coalesce((to_jsonb(pr)->>'is_sample')::boolean, false)
    order by score desc, p.publish_at desc
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

create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

revoke all on function public.server_now() from public, anon, authenticated;
grant execute on function public.server_now() to service_role;
