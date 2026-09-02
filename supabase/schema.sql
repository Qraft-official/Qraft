-- Qraft problems + profiles
-- Run this in the Supabase SQL Editor (Dashboard → SQL).
-- Enables Auth-backed posting, public timeline reads, and the 21:00 sprint flag.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  handle text unique,
  age integer check (age is null or age >= 0),
  onboarded boolean not null default false,
  math_tier smallint not null default 1 check (math_tier between 1 and 5),
  physics_tier smallint not null default 1 check (physics_tier between 1 and 5),
  chemistry_tier smallint not null default 1 check (chemistry_tier between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  problem_text text not null,
  solution text,
  subject text not null default 'math'
    check (subject in ('math', 'physics', 'chemistry')),
  photo text,
  is_sprint boolean not null default false,
  sprint_day date,
  pages jsonb,
  problem_format text,
  created_at timestamptz not null default now(),
  mode text not null default 'question'
    check (mode in ('question', 'challenge')),
  correct_answer text
);

create index if not exists problems_created_at_idx
  on public.problems (created_at desc);

create index if not exists problems_author_id_idx
  on public.problems (author_id);

create index if not exists problems_sprint_idx
  on public.problems (is_sprint, created_at desc)
  where is_sprint;

create table if not exists public.admin_allowlist (
  email text primary key
);

alter table public.admin_allowlist enable row level security;
revoke all on public.admin_allowlist from anon, authenticated;

insert into public.admin_allowlist (email)
values ('shougay1919@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_allowlist a
    where lower(a.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
  or coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin';
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.problems enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "problems are readable" on public.problems;
create policy "problems are readable"
  on public.problems for select
  to anon, authenticated
  using (true);

drop policy if exists "users can insert own problems" on public.problems;
drop policy if exists "admins can insert problems" on public.problems;
create policy "users can insert own problems"
  on public.problems for insert
  to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "users can update own problems" on public.problems;
drop policy if exists "admins can update problems" on public.problems;
create policy "users can update own problems"
  on public.problems for update
  to authenticated
  using (author_id = (select auth.uid()) or public.is_admin())
  with check (author_id = (select auth.uid()) or public.is_admin());

drop policy if exists "users can delete own problems" on public.problems;
drop policy if exists "admins can delete problems" on public.problems;
create policy "users can delete own problems"
  on public.problems for delete
  to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.problems to anon, authenticated;
grant insert, update, delete on public.problems to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create unique index if not exists notifications_welcome_once
  on public.notifications (user_id)
  where title = '🎉 Qraftへようこそ！';

create unique index if not exists notifications_premium_thanks_once
  on public.notifications (user_id)
  where title = '👑 プレミアムプランへようこそ！ご支援ありがとうございます！';

alter table public.notifications enable row level security;

drop policy if exists "users can read own notifications" on public.notifications;
create policy "users can read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "users can update own notifications" on public.notifications;
create policy "users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "users can insert own notifications" on public.notifications;
create policy "users can insert own notifications"
  on public.notifications for insert
  to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.notifications to authenticated;

create or replace function public.ensure_welcome_notification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    return;
  end if;
  insert into public.notifications (user_id, title, message)
  select
    uid,
    '🎉 Qraftへようこそ！',
    E'Qraft（クラフト）をご利用いただきありがとうございます！\nみんなで問題を出し合ったり、手書きや数式エディタで解法をシェアして楽しんでくださいね。\n\n【iPhone / iPad（iOS）をご利用の方へ】\n現在、開発者の環境都合によりネイティブアプリ版はAndroid限定公開となっています。\nApple端末（iOS）をご利用の方は、Webブラウザ（SafariやChromeなど）から快適にご利用いただけます！'
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = uid
      and n.title = '🎉 Qraftへようこそ！'
  );
end;
$$;

revoke all on function public.ensure_welcome_notification() from public, anon;
grant execute on function public.ensure_welcome_notification() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case
      when lower(coalesce(new.raw_user_meta_data ->> 'handle', '')) = 'advertisement' then null
      else nullif(new.raw_user_meta_data ->> 'handle', '')
    end
  )
  on conflict (id) do nothing;

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

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.problems replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.problems;
exception
  when duplicate_object then null;
end $$;

-- Referral program (also applied remotely)
alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_referral_coupon_id text,
  add column if not exists premium_trial_until timestamptz;

-- Challenge / 教えて！Qraft modes (also applied remotely)
alter table public.problems
  add column if not exists mode text not null default 'question',
  add column if not exists correct_answer text;

alter table public.problems drop constraint if exists problems_mode_check;
alter table public.problems
  add constraint problems_mode_check check (mode in ('question', 'challenge'));

-- Half-price invite campaign (also applied remotely)
alter table public.profiles
  add column if not exists is_half_discount_eligible boolean not null default false,
  add column if not exists campaign_x_follow_tapped_at timestamptz,
  add column if not exists campaign_x_post_tapped_at timestamptz;

create table if not exists public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('invite_open', 'x_follow', 'x_post')),
  referrer_id uuid references public.profiles (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  device_id text not null check (char_length(device_id) >= 8 and char_length(device_id) <= 128),
  created_at timestamptz not null default now()
);

alter table public.campaign_events enable row level security;
revoke all on public.campaign_events from anon, authenticated;

-- Account ID (handle) change history + 14-day / 2-change limit (also applied remotely)
create table if not exists public.handle_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  old_handle text,
  new_handle text not null,
  changed_at timestamptz not null default now()
);

create index if not exists handle_changes_user_changed_idx
  on public.handle_changes (user_id, changed_at desc);

alter table public.handle_changes enable row level security;

drop policy if exists "users can read own handle changes" on public.handle_changes;
create policy "users can read own handle changes"
  on public.handle_changes for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "users can insert own handle changes" on public.handle_changes;
create policy "users can insert own handle changes"
  on public.handle_changes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create or replace function public.enforce_handle_change_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  used int;
begin
  if new.handle is not distinct from old.handle then
    return new;
  end if;
  select count(*) into used
  from public.handle_changes
  where user_id = new.id
    and changed_at >= now() - interval '14 days';
  if used >= 2 then
    raise exception 'HANDLE_CHANGE_LIMIT';
  end if;
  insert into public.handle_changes (user_id, old_handle, new_handle)
  values (new.id, old.handle, new.handle);
  return new;
end;
$$;

drop trigger if exists trg_enforce_handle_change_limit on public.profiles;
create trigger trg_enforce_handle_change_limit
before update of handle on public.profiles
for each row
execute function public.enforce_handle_change_limit();

-- Problem difficulty + 「？」 reactions (also applied remotely)
alter table public.problems
  add column if not exists difficulty_level smallint not null default 3,
  add column if not exists confused_count integer not null default 0,
  add column if not exists is_hard_spotlight boolean not null default false;

create table if not exists public.problem_reactions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  emoji text not null default '?' check (emoji = '?'),
  created_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

alter table public.problem_reactions enable row level security;

alter table public.problems
  add column if not exists promoted boolean not null default false,
  add column if not exists promoted_at timestamptz;

create or replace function public.promote_own_problem(p_problem_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  actor uuid := auth.uid();
  month_start timestamptz := date_trunc('month', now());
begin
  if actor is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.problems
    where id = p_problem_id and author_id = actor
  ) then
    raise exception 'NOT_OWNER';
  end if;
  if exists (
    select 1 from public.problems
    where author_id = actor
      and promoted_at >= month_start
      and id <> p_problem_id
  ) then
    raise exception 'PROMO_USED';
  end if;
  if exists (
    select 1 from public.problems
    where id = p_problem_id
      and author_id = actor
      and promoted_at >= month_start
  ) then
    raise exception 'PROMO_USED';
  end if;
  update public.problems
    set promoted = true,
        promoted_at = now()
    where id = p_problem_id and author_id = actor;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.promote_own_problem(uuid) from public, anon;
grant execute on function public.promote_own_problem(uuid) to authenticated;

-- Reserved account IDs (users cannot claim advertisement)
create or replace function public.enforce_reserved_handle()
returns trigger
language plpgsql
as $$
begin
  if new.handle is not null and lower(new.handle) = 'advertisement' then
    raise exception 'RESERVED_HANDLE';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_reserved_handle on public.profiles;
create trigger trg_enforce_reserved_handle
before insert or update of handle on public.profiles
for each row
execute function public.enforce_reserved_handle();


