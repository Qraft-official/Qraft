-- Sample / launch accounts for Qraft fictional profiles.
-- Adds is_sample + bio, a seed-key map, ranking exclusions, and profile flag protection.

alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists is_sample boolean not null default false;

create index if not exists profiles_is_sample_idx
  on public.profiles (id)
  where is_sample;

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

revoke update (is_sample) on table public.profiles from anon, authenticated;

create or replace function public.protect_profile_is_sample()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.is_sample is distinct from old.is_sample then
    if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
      new.is_sample := old.is_sample;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_is_sample on public.profiles;
create trigger trg_protect_profile_is_sample
before update of is_sample on public.profiles
for each row
execute function public.protect_profile_is_sample();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_handle text;
  is_sample boolean;
  bio_text text;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  claimed_handle := nullif(btrim(new.raw_user_meta_data ->> 'handle'), '');
  if claimed_handle is not null and lower(claimed_handle) = 'advertisement' then
    claimed_handle := null;
  end if;
  if claimed_handle is not null and claimed_handle !~ '^[A-Za-z0-9_]{3,20}$' then
    claimed_handle := null;
  end if;

  is_sample := lower(coalesce(new.raw_app_meta_data ->> 'qraft_sample', '')) in ('true', 't', '1');
  bio_text := coalesce(new.raw_user_meta_data ->> 'bio', '');

  begin
    insert into public.profiles (id, name, handle, bio, is_sample)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'name', ''),
      claimed_handle,
      bio_text,
      is_sample
    )
    on conflict (id) do update
      set name = case
        when public.profiles.name = '' then excluded.name
        else public.profiles.name
      end,
      handle = coalesce(public.profiles.handle, excluded.handle),
      bio = case
        when public.profiles.bio = '' then excluded.bio
        else public.profiles.bio
      end,
      is_sample = public.profiles.is_sample or excluded.is_sample;
  exception
    when unique_violation then
      insert into public.profiles (id, name, handle, bio, is_sample)
      values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), null, bio_text, is_sample)
      on conflict (id) do nothing;
  end;

  if not is_sample then
    insert into public.notifications (user_id, title, message)
    select
      new.id,
      '🎉 Qraftへようこそ！',
      E'Qraft（クラフト）をご利用いただきありがとうございます！\nみんなで問題を出し合ったり、手書きや数式エディタで解法をシェアして楽しんでくださいね。\n\n【iPhone / iPad（iOS）をご利用の方へ】\n現在、開発者の環境都合によりネイティブアプリ版はAndroid限定公開となっています。\nApple端末（iOS）をご利用の方は、Webブラウザ（SafariやChromeなど）から快適にご利用いただけます！'
    where not exists (
      select 1
      from public.notifications n
      where n.user_id = new.id
        and n.title = '🎉 Qraftへようこそ！'
    );
  end if;

  return new;
end;
$$;

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
    cross join since
    where r.created_at >= since.t
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
    left join rx on rx.problem_id = p.id
    cross join since
    where p.created_at >= since.t
      and not coalesce(p.is_sprint, false)
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
