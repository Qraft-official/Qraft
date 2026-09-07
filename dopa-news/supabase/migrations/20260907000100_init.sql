-- =====================================================================
-- Dopa News - initial schema
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  bio text,
  is_admin boolean not null default false,
  home_area text,
  preferred_categories text[] not null default '{}',
  notify_breaking boolean not null default true,
  notify_local_emergency boolean not null default true,
  notify_vote_result boolean not null default true,
  notify_important boolean not null default true,
  notify_map_nearby boolean not null default false,
  allow_location boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 1 and 24),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 160)
);

-- ---------------------------------------------------------------------
-- news_articles
-- ---------------------------------------------------------------------
create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  what_happened text not null,
  why_trending text not null,
  three_second_summary text not null,
  social_reaction_summary text,
  category text not null,
  image_url text,
  source_name text not null,
  source_url text not null,
  source_type text not null default 'major_media',
  keywords text[] not null default '{}',
  heat integer not null default 0,
  is_breaking boolean not null default false,
  is_published boolean not null default true,
  is_sample boolean not null default false,
  -- Maintained by sync_news_search_text(); a generated column is not possible
  -- because array_to_string() is only STABLE, not IMMUTABLE.
  search_text text not null default '',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_source_type_valid
    check (source_type in ('official', 'major_media', 'multi_report', 'unconfirmed')),
  constraint news_heat_range check (heat between 0 and 100),
  constraint news_title_length check (char_length(title) between 1 and 120)
);

create index if not exists news_articles_published_at_idx
  on public.news_articles (published_at desc);
create index if not exists news_articles_category_idx
  on public.news_articles (category, published_at desc);
create index if not exists news_articles_breaking_idx
  on public.news_articles (is_breaking, published_at desc) where is_breaking;
create index if not exists news_articles_search_idx
  on public.news_articles using gin (search_text gin_trgm_ops);
create index if not exists news_articles_keywords_idx
  on public.news_articles using gin (keywords);

-- ---------------------------------------------------------------------
-- news_quizzes  (未来予測クイズ)
-- ---------------------------------------------------------------------
create table if not exists public.news_quizzes (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null unique references public.news_articles (id) on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  result_option text,
  result_note text,
  resolved_at timestamptz,
  votes_a integer not null default 0,
  votes_b integer not null default 0,
  votes_c integer not null default 0,
  created_at timestamptz not null default now(),
  constraint quiz_result_option_valid check (result_option is null or result_option in ('A', 'B', 'C'))
);

create index if not exists news_quizzes_news_id_idx on public.news_quizzes (news_id);

-- ---------------------------------------------------------------------
-- news_votes  (1ユーザー1票)
-- ---------------------------------------------------------------------
create table if not exists public.news_votes (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.news_quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  selected_option text not null,
  created_at timestamptz not null default now(),
  constraint votes_option_valid check (selected_option in ('A', 'B', 'C')),
  constraint votes_unique_per_user unique (quiz_id, user_id)
);

create index if not exists news_votes_user_idx on public.news_votes (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- saved_news / news_views
-- ---------------------------------------------------------------------
create table if not exists public.saved_news (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  news_id uuid not null references public.news_articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_news_unique unique (user_id, news_id)
);

create index if not exists saved_news_user_idx on public.saved_news (user_id, created_at desc);

create table if not exists public.news_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  news_id uuid not null references public.news_articles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  constraint news_views_unique unique (user_id, news_id)
);

create index if not exists news_views_user_idx on public.news_views (user_id, viewed_at desc);

-- ---------------------------------------------------------------------
-- map_posts  (ドパマップ投稿)
-- ---------------------------------------------------------------------
create table if not exists public.map_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  post_type text not null,
  category text not null,
  comment text,
  image_url text,
  urgency boolean not null default false,
  area text,
  helpful_count integer not null default 0,
  report_count integer not null default 0,
  is_official boolean not null default false,
  is_hidden boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '6 hours',
  constraint map_post_type_valid check (post_type in ('weather', 'live')),
  constraint map_lat_range check (latitude between -90 and 90),
  constraint map_lng_range check (longitude between -180 and 180),
  constraint map_comment_length check (comment is null or char_length(comment) <= 100)
);

create index if not exists map_posts_active_idx on public.map_posts (expires_at desc);
create index if not exists map_posts_bbox_idx on public.map_posts (latitude, longitude);
create index if not exists map_posts_user_idx on public.map_posts (user_id, created_at desc);
create index if not exists map_posts_type_idx on public.map_posts (post_type, created_at desc);

-- ---------------------------------------------------------------------
-- map_reactions
-- ---------------------------------------------------------------------
create table if not exists public.map_reactions (
  id uuid primary key default gen_random_uuid(),
  map_post_id uuid not null references public.map_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction_type text not null default 'helpful',
  created_at timestamptz not null default now(),
  constraint map_reaction_type_valid check (reaction_type in ('helpful')),
  constraint map_reaction_unique unique (map_post_id, user_id, reaction_type)
);

create index if not exists map_reactions_post_idx on public.map_reactions (map_post_id);
create index if not exists map_reactions_user_idx on public.map_reactions (user_id);

-- ---------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint report_target_valid check (target_type in ('map_post', 'news', 'profile')),
  constraint report_status_valid check (status in ('open', 'reviewed', 'dismissed')),
  constraint report_unique unique (user_id, target_type, target_id)
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notification_type_valid
    check (type in ('breaking', 'local_emergency', 'vote_result', 'important', 'map_nearby'))
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where not read;

-- =====================================================================
-- Helper functions
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Trigram search index feed. Concatenating here (rather than in a generated
-- column) keeps the write path immutable-safe.
create or replace function public.sync_news_search_text()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.search_text :=
    coalesce(new.title, '') || ' ' || coalesce(new.summary, '') || ' '
    || coalesce(new.what_happened, '') || ' ' || coalesce(new.why_trending, '') || ' '
    || coalesce(new.three_second_summary, '') || ' ' || coalesce(new.category, '') || ' '
    || coalesce(new.source_name, '') || ' ' || array_to_string(coalesce(new.keywords, '{}'), ' ');
  return new;
end;
$$;

drop trigger if exists news_sync_search_text on public.news_articles;
create trigger news_sync_search_text
  before insert or update on public.news_articles
  for each row execute function public.sync_news_search_text();

-- Create a profile row whenever a new auth user appears.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired text;
begin
  desired := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    split_part(coalesce(new.email, 'dopa'), '@', 1)
  );
  desired := left(regexp_replace(desired, '[^[:alnum:]_ぁ-んァ-ヶ一-龠ー]', '', 'g'), 24);
  if desired = '' then
    desired := 'dopa_user';
  end if;

  insert into public.profiles (id, username)
  values (new.id, desired)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep denormalised vote counters in sync so results are readable by
-- everyone while individual ballots stay private.
create or replace function public.sync_quiz_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.quiz_id, old.quiz_id);
  update public.news_quizzes q
  set votes_a = (select count(*) from public.news_votes v where v.quiz_id = target and v.selected_option = 'A'),
      votes_b = (select count(*) from public.news_votes v where v.quiz_id = target and v.selected_option = 'B'),
      votes_c = (select count(*) from public.news_votes v where v.quiz_id = target and v.selected_option = 'C')
  where q.id = target;
  return null;
end;
$$;

drop trigger if exists news_votes_sync_counts on public.news_votes;
create trigger news_votes_sync_counts
  after insert or delete on public.news_votes
  for each row execute function public.sync_quiz_vote_counts();

create or replace function public.sync_map_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.map_post_id, old.map_post_id);
  update public.map_posts p
  set helpful_count = (
    select count(*) from public.map_reactions r
    where r.map_post_id = target and r.reaction_type = 'helpful'
  )
  where p.id = target;
  return null;
end;
$$;

drop trigger if exists map_reactions_sync_count on public.map_reactions;
create trigger map_reactions_sync_count
  after insert or delete on public.map_reactions
  for each row execute function public.sync_map_helpful_count();

-- Report counter + auto-hide clearly brigaded posts.
create or replace function public.sync_report_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.target_type = 'map_post' then
    update public.map_posts p
    set report_count = (
          select count(*) from public.reports r
          where r.target_type = 'map_post' and r.target_id = new.target_id
        ),
        is_hidden = (
          select count(*) >= 3 from public.reports r
          where r.target_type = 'map_post' and r.target_id = new.target_id
        )
    where p.id = new.target_id;
  end if;
  return null;
end;
$$;

drop trigger if exists reports_sync_count on public.reports;
create trigger reports_sync_count
  after insert on public.reports
  for each row execute function public.sync_report_count();

-- Location privacy + anti-spam guard rails for map posts.
create or replace function public.guard_map_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  last_post timestamptz;
begin
  -- Round coordinates to ~110m so a post cannot pinpoint someone's home.
  new.latitude := round(new.latitude::numeric, 3)::double precision;
  new.longitude := round(new.longitude::numeric, 3)::double precision;

  new.expires_at := least(
    coalesce(new.expires_at, now() + interval '6 hours'),
    now() + interval '24 hours'
  );
  if new.expires_at <= now() then
    new.expires_at := now() + interval '3 hours';
  end if;

  if new.is_sample then
    return new;
  end if;

  select max(created_at), count(*)
    into last_post, recent_count
  from public.map_posts
  where user_id = new.user_id and created_at > now() - interval '10 minutes';

  if last_post is not null and last_post > now() - interval '30 seconds' then
    raise exception 'RATE_LIMIT_COOLDOWN' using errcode = 'check_violation';
  end if;

  if recent_count >= 5 then
    raise exception 'RATE_LIMIT_BURST' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists map_posts_guard on public.map_posts;
create trigger map_posts_guard
  before insert on public.map_posts
  for each row execute function public.guard_map_post();

-- Notify voters once an admin resolves a prediction quiz.
create or replace function public.notify_quiz_resolved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.result_option is not null and coalesce(old.result_option, '') <> new.result_option then
    insert into public.notifications (user_id, type, title, body, link)
    select v.user_id,
           'vote_result',
           '予想の答え合わせができます',
           case when v.selected_option = new.result_option
                then 'あなたの予想は当たりました'
                else 'あなたの予想とは違う結果になりました' end,
           '/news/' || new.news_id::text
    from public.news_votes v
    join public.profiles p on p.id = v.user_id
    where v.quiz_id = new.id and p.notify_vote_result;
  end if;
  return new;
end;
$$;

drop trigger if exists quiz_resolved_notify on public.news_quizzes;
create trigger quiz_resolved_notify
  after update on public.news_quizzes
  for each row execute function public.notify_quiz_resolved();

create or replace function public.notify_breaking_news()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_breaking and new.is_published then
    insert into public.notifications (user_id, type, title, body, link)
    select p.id, 'breaking', '速報: ' || left(new.title, 40), new.three_second_summary, '/news/' || new.id::text
    from public.profiles p
    where p.notify_breaking;
  end if;
  return null;
end;
$$;

drop trigger if exists news_breaking_notify on public.news_articles;
create trigger news_breaking_notify
  after insert on public.news_articles
  for each row execute function public.notify_breaking_news();

-- Nearby report clustering used by the "この周辺で N 人が報告" badge and by
-- the trend panel. Runs as definer so it can see every live post while
-- individual rows stay behind RLS.
create or replace function public.map_nearby_report_count(
  p_lat double precision,
  p_lng double precision,
  p_category text,
  p_radius_m double precision default 800
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct user_id)::integer
  from public.map_posts
  where category = p_category
    and not is_hidden
    and expires_at > now()
    and 111320 * sqrt(
          power(latitude - p_lat, 2)
          + power((longitude - p_lng) * cos(radians(p_lat)), 2)
        ) <= p_radius_m;
$$;

-- =====================================================================
-- Row level security
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.news_articles enable row level security;
alter table public.news_quizzes enable row level security;
alter table public.news_votes enable row level security;
alter table public.saved_news enable row level security;
alter table public.news_views enable row level security;
alter table public.map_posts enable row level security;
alter table public.map_reactions enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

-- profiles ------------------------------------------------------------
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = id);

-- news_articles -------------------------------------------------------
drop policy if exists news_select_published on public.news_articles;
create policy news_select_published on public.news_articles
  for select using (is_published or public.is_admin());

drop policy if exists news_admin_write on public.news_articles;
create policy news_admin_write on public.news_articles
  for all using (public.is_admin()) with check (public.is_admin());

-- news_quizzes --------------------------------------------------------
drop policy if exists quizzes_select_all on public.news_quizzes;
create policy quizzes_select_all on public.news_quizzes
  for select using (true);

drop policy if exists quizzes_admin_write on public.news_quizzes;
create policy quizzes_admin_write on public.news_quizzes
  for all using (public.is_admin()) with check (public.is_admin());

-- news_votes (insert once, never editable) ----------------------------
drop policy if exists votes_select_own on public.news_votes;
create policy votes_select_own on public.news_votes
  for select using (auth.uid() = user_id);

drop policy if exists votes_insert_own on public.news_votes;
create policy votes_insert_own on public.news_votes
  for insert with check (auth.uid() = user_id);

-- saved_news ----------------------------------------------------------
drop policy if exists saved_select_own on public.saved_news;
create policy saved_select_own on public.saved_news
  for select using (auth.uid() = user_id);

drop policy if exists saved_insert_own on public.saved_news;
create policy saved_insert_own on public.saved_news
  for insert with check (auth.uid() = user_id);

drop policy if exists saved_delete_own on public.saved_news;
create policy saved_delete_own on public.saved_news
  for delete using (auth.uid() = user_id);

-- news_views ----------------------------------------------------------
drop policy if exists views_select_own on public.news_views;
create policy views_select_own on public.news_views
  for select using (auth.uid() = user_id);

drop policy if exists views_insert_own on public.news_views;
create policy views_insert_own on public.news_views
  for insert with check (auth.uid() = user_id);

drop policy if exists views_update_own on public.news_views;
create policy views_update_own on public.news_views
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists views_delete_own on public.news_views;
create policy views_delete_own on public.news_views
  for delete using (auth.uid() = user_id);

-- map_posts -----------------------------------------------------------
drop policy if exists map_posts_select_live on public.map_posts;
create policy map_posts_select_live on public.map_posts
  for select using (
    (not is_hidden and expires_at > now())
    or auth.uid() = user_id
    or public.is_admin()
  );

drop policy if exists map_posts_insert_own on public.map_posts;
create policy map_posts_insert_own on public.map_posts
  for insert with check (auth.uid() = user_id and not is_official and not is_sample);

-- Admins seed and moderate sample map posts, including posts attributed to
-- the sample persona accounts.
drop policy if exists map_posts_admin_insert on public.map_posts;
create policy map_posts_admin_insert on public.map_posts
  for insert with check (public.is_admin());

drop policy if exists map_posts_delete_own on public.map_posts;
create policy map_posts_delete_own on public.map_posts
  for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists map_posts_admin_update on public.map_posts;
create policy map_posts_admin_update on public.map_posts
  for update using (public.is_admin()) with check (public.is_admin());

-- map_reactions -------------------------------------------------------
drop policy if exists map_reactions_select_own on public.map_reactions;
create policy map_reactions_select_own on public.map_reactions
  for select using (auth.uid() = user_id);

drop policy if exists map_reactions_insert_own on public.map_reactions;
create policy map_reactions_insert_own on public.map_reactions
  for insert with check (auth.uid() = user_id);

drop policy if exists map_reactions_delete_own on public.map_reactions;
create policy map_reactions_delete_own on public.map_reactions
  for delete using (auth.uid() = user_id);

-- reports -------------------------------------------------------------
drop policy if exists reports_select_own on public.reports;
create policy reports_select_own on public.reports
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert with check (auth.uid() = user_id);

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- notifications -------------------------------------------------------
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete using (auth.uid() = user_id);

grant execute on function public.map_nearby_report_count(double precision, double precision, text, double precision)
  to anon, authenticated;
