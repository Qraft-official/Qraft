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
  bio text not null default '',
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

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
    check (mode in ('question', 'challenge', 'aha')),
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

create or replace function public.is_email_confirmed()
returns boolean
language sql
stable
security definer
set search_path = auth
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and email_confirmed_at is not null
  );
$$;

revoke all on function public.is_email_confirmed() from public, anon;
grant execute on function public.is_email_confirmed() to authenticated;

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()) and public.is_email_confirmed());

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
declare
  claimed_handle text;
  is_sample boolean;
  bio_text text;
begin
  -- Do not insert public.profiles (or claim a unique handle) until email is confirmed.
  -- Unconfirmed signups stay in auth.users only, so abandoned IDs are not locked.
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

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Abandoned (unconfirmed) signups must not occupy email or handle.
create or replace function public.recycle_unconfirmed_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  claimed_handle text;
begin
  claimed_handle := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'handle', '')), '');

  delete from auth.users u
  where u.email_confirmed_at is null
    and u.id is distinct from new.id
    and (
      (new.email is not null and lower(u.email) = lower(new.email))
      or (
        claimed_handle is not null
        and lower(coalesce(u.raw_user_meta_data ->> 'handle', '')) = lower(claimed_handle)
      )
    );

  return new;
end;
$$;

revoke all on function public.recycle_unconfirmed_auth_user() from public, anon, authenticated;

drop trigger if exists trg_recycle_unconfirmed_auth_user on auth.users;
create trigger trg_recycle_unconfirmed_auth_user
  before insert on auth.users
  for each row execute function public.recycle_unconfirmed_auth_user();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_new_user();

-- Release profiles / handles already claimed by accounts that never confirmed email.
delete from public.profiles p
using auth.users u
where p.id = u.id
  and u.email_confirmed_at is null;

create or replace function public.purge_unconfirmed_auth_users(max_age interval default interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  n integer := 0;
begin
  delete from auth.users
  where email_confirmed_at is null
    and created_at < now() - max_age;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.purge_unconfirmed_auth_users(interval) from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('purge-unconfirmed-auth-users');
exception
  when others then null;
end $$;

do $$
begin
  perform cron.schedule(
    'purge-unconfirmed-auth-users',
    '15 * * * *',
    $cron$select public.purge_unconfirmed_auth_users(interval '24 hours')$cron$
  );
exception
  when others then null;
end $$;

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

create table if not exists public.referral_claims (
  referee_id uuid primary key references public.profiles (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  device_id text not null check (char_length(device_id) >= 8 and char_length(device_id) <= 128),
  device_fingerprint text check (
    device_fingerprint is null
    or (char_length(device_fingerprint) >= 16 and char_length(device_fingerprint) <= 128)
  ),
  applied_at timestamptz not null default now(),
  mission_deadline timestamptz not null,
  trial_until timestamptz not null,
  solves integer not null default 0,
  posts integer not null default 0,
  login_streak integer not null default 1,
  last_login_date date,
  completed_at timestamptz,
  expired_at timestamptz,
  discount_awarded_at timestamptz,
  constraint referral_claims_no_self check (referee_id <> referrer_id)
);

alter table public.referral_claims
  add column if not exists device_fingerprint text;

do $$
begin
  alter table public.referral_claims
    add constraint referral_claims_no_self check (referee_id <> referrer_id);
exception
  when duplicate_object then null;
end $$;

create unique index if not exists referral_claims_device_id_uidx
  on public.referral_claims (device_id);

create unique index if not exists referral_claims_device_fingerprint_uidx
  on public.referral_claims (device_fingerprint)
  where device_fingerprint is not null;

alter table public.referral_claims enable row level security;
revoke all on public.referral_claims from anon, authenticated;

-- Fraud review (see migrations/20260904130000_referral_fraud_check.sql)
alter table public.referral_claims
  add column if not exists status text,
  add column if not exists risk_score integer,
  add column if not exists risk_reasons jsonb,
  add column if not exists network_hash text,
  add column if not exists reviewed_at timestamptz;

-- Challenge / 教えて！Qraft modes (also applied remotely)
alter table public.problems
  add column if not exists mode text not null default 'question',
  add column if not exists correct_answer text;

alter table public.problems drop constraint if exists problems_mode_check;
alter table public.problems
  add constraint problems_mode_check check (mode in ('question', 'challenge', 'aha'));

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
  -- Releasing an unconfirmed / abandoned handle must not log a change (new_handle is NOT NULL).
  if new.handle is null then
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

-- Handwriting canvases are stored as PNG in Storage; DB keeps public URLs only.
insert into storage.buckets (id, name, public)
values ('problem-images', 'problem-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "problem-images public read" on storage.objects;
create policy "problem-images public read"
on storage.objects
for select
to public
using (bucket_id = 'problem-images');

drop policy if exists "problem-images authenticated upload" on storage.objects;
create policy "problem-images authenticated upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'problem-images'
  and (storage.foldername(name))[1] = 'drawings'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop index if exists referral_apply_log_ip_created_idx;
drop index if exists referral_apply_log_ip_success_idx;
drop table if exists public.referral_apply_log;

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

revoke all on function public.weekly_highlights() from public;
grant execute on function public.weekly_highlights() to anon, authenticated;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.problems (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_created_idx
  on public.comments (post_id, created_at);

alter table public.comments enable row level security;

drop policy if exists "comments are readable" on public.comments;
create policy "comments are readable"
  on public.comments for select
  using (true);

drop policy if exists "users can insert own comments" on public.comments;
create policy "users can insert own comments"
  on public.comments for insert
  with check (author_id = (select auth.uid()));

drop policy if exists "authors or post owners can delete comments" on public.comments;
create policy "authors or post owners can delete comments"
  on public.comments for delete
  using (
    author_id = (select auth.uid())
    or exists (
      select 1
      from public.problems p
      where p.id = comments.post_id
        and p.author_id = (select auth.uid())
    )
  );

grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;

-- Stripe billing (server/webhook only; see migrations/20260904124000_add_stripe_subscription_status.sql)
alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists premium_status text,
  add column if not exists premium_current_period_end timestamptz;

-- Learning features (canonical DDL: migrations/20260904140000_learning_features.sql)
alter table public.notifications
  add column if not exists link text,
  add column if not exists dedupe_key text;

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

create table if not exists public.saved_problems (
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  category text not null default 'later'
    check (category in ('later', 'exam', 'hard')),
  created_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

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

create table if not exists public.difficulty_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  vote smallint not null check (vote in (1, 2, 3)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

create table if not exists public.problem_series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_post_notifications (
  subscriber_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, author_id),
  check (subscriber_id <> author_id)
);

create table if not exists public.learning_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('solve', 'post', 'pulse')),
  problem_id uuid references public.problems (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Launch window + Early Access membership. Public release is timestamp-driven (JST).

create table if not exists public.release_schedule (
  id integer primary key check (id = 1),
  early_access_start timestamptz not null,
  public_release_at timestamptz not null,
  early_access_cap integer not null default 30 check (early_access_cap > 0)
);

insert into public.release_schedule (id, early_access_start, public_release_at, early_access_cap)
values (1, '2026-09-12 00:00:00+09', '2026-09-19 00:00:00+09', 30)
on conflict (id) do nothing;

alter table public.release_schedule enable row level security;
revoke all on public.release_schedule from public, anon, authenticated;
grant select on public.release_schedule to anon, authenticated;

drop policy if exists "release_schedule is readable" on public.release_schedule;
create policy "release_schedule is readable"
  on public.release_schedule for select
  to anon, authenticated
  using (true);

create table if not exists public.early_access_invite_codes (
  code text primary key,
  note text,
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.early_access_invite_codes enable row level security;
revoke all on public.early_access_invite_codes from public, anon, authenticated;

create table if not exists public.early_access_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  invite_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists early_access_members_created_idx
  on public.early_access_members (created_at);

alter table public.early_access_members enable row level security;
revoke all on public.early_access_members from public, anon;
grant select on public.early_access_members to authenticated;

drop policy if exists "members can read own early access row" on public.early_access_members;
create policy "members can read own early access row"
  on public.early_access_members for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.release_phase()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when now() < s.early_access_start then 'prelaunch'
    when now() < s.public_release_at then 'early'
    else 'public'
  end
  from (
    select
      coalesce(
        (select early_access_start from public.release_schedule where id = 1),
        timestamptz '2026-09-12 00:00:00+09'
      ) as early_access_start,
      coalesce(
        (select public_release_at from public.release_schedule where id = 1),
        timestamptz '2026-09-19 00:00:00+09'
      ) as public_release_at
  ) s;
$$;

revoke all on function public.release_phase() from public;
grant execute on function public.release_phase() to anon, authenticated;

create or replace function public.app_is_public_release()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.release_phase() = 'public';
$$;

revoke all on function public.app_is_public_release() from public;
grant execute on function public.app_is_public_release() to anon, authenticated;

create or replace function public.can_use_app()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.app_is_public_release()
    or public.is_admin()
    or exists (
      select 1
      from public.early_access_members m
      where m.user_id = (select auth.uid())
    );
$$;

revoke all on function public.can_use_app() from public;
grant execute on function public.can_use_app() to anon, authenticated;

create or replace function public.try_enroll_early_access(p_user_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  cap integer;
  n integer;
  valid boolean;
begin
  if public.app_is_public_release() then
    return jsonb_build_object('ok', true, 'reason', 'public');
  end if;
  if public.release_phase() <> 'early' then
    return jsonb_build_object('ok', false, 'reason', 'prelaunch');
  end if;
  if exists (select 1 from public.early_access_members where user_id = p_user_id) then
    return jsonb_build_object('ok', true, 'reason', 'already');
  end if;

  normalized := upper(btrim(coalesce(p_code, '')));
  perform pg_advisory_xact_lock(87236401);

  select exists (
    select 1
    from public.early_access_invite_codes c
    where c.code = normalized and not c.disabled
  ) into valid;
  if not valid then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select early_access_cap into cap from public.release_schedule where id = 1;
  cap := coalesce(cap, 30);
  select count(*)::int into n from public.early_access_members;
  if n >= cap then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  insert into public.early_access_members (user_id, invite_code)
  values (p_user_id, normalized);
  return jsonb_build_object('ok', true, 'reason', 'enrolled');
end;
$$;

revoke all on function public.try_enroll_early_access(uuid, text) from public, anon, authenticated;
grant execute on function public.try_enroll_early_access(uuid, text) to service_role;

drop policy if exists "users can insert own problems" on public.problems;
create policy "users can insert own problems"
  on public.problems for insert
  to authenticated
  with check (author_id = (select auth.uid()) and public.can_use_app());

drop policy if exists "users can update own problems" on public.problems;
create policy "users can update own problems"
  on public.problems for update
  to authenticated
  using (author_id = (select auth.uid()) or public.is_admin())
  with check ((author_id = (select auth.uid()) or public.is_admin()) and (public.is_admin() or public.can_use_app()));

drop policy if exists "users can delete own problems" on public.problems;
create policy "users can delete own problems"
  on public.problems for delete
  to authenticated
  using ((author_id = (select auth.uid()) or public.is_admin()) and (public.is_admin() or public.can_use_app()));

drop policy if exists "users can insert own comments" on public.comments;
create policy "users can insert own comments"
  on public.comments for insert
  to authenticated
  with check (author_id = (select auth.uid()) and public.can_use_app());

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and (public.can_use_app() or public.app_is_public_release()));
