-- Star ratings (elegance / aha kinds). One row per user per post per kind.
-- Additive: does not alter existing reaction / Aha-like / problem_reactions tables.

create table if not exists public.post_ratings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id text not null,
  kind text not null check (kind in ('elegance', 'aha')),
  stars smallint not null check (stars >= 1 and stars <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, post_id, kind)
);

create index if not exists post_ratings_post_kind_idx
  on public.post_ratings (post_id, kind);

alter table public.post_ratings enable row level security;

drop policy if exists "post_ratings_select_authenticated" on public.post_ratings;
create policy "post_ratings_select_authenticated"
  on public.post_ratings for select
  to authenticated
  using (true);

drop policy if exists "post_ratings_insert_own" on public.post_ratings;
create policy "post_ratings_insert_own"
  on public.post_ratings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "post_ratings_update_own" on public.post_ratings;
create policy "post_ratings_update_own"
  on public.post_ratings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "post_ratings_delete_own" on public.post_ratings;
create policy "post_ratings_delete_own"
  on public.post_ratings for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.post_ratings to authenticated;
revoke all on public.post_ratings from anon;

create or replace function public.post_rating_stats(p_post_ids text[])
returns table (
  post_id text,
  kind text,
  rating_sum double precision,
  rating_count integer,
  my_stars integer
)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select
    r.post_id,
    r.kind,
    coalesce(sum(r.stars), 0)::double precision as rating_sum,
    count(*)::integer as rating_count,
    max(r.stars) filter (where r.user_id = (select auth.uid()))::integer as my_stars
  from public.post_ratings r
  where r.post_id = any (p_post_ids)
  group by r.post_id, r.kind;
$$;

revoke all on function public.post_rating_stats(text[]) from public, anon;
grant execute on function public.post_rating_stats(text[]) to authenticated;

create or replace function public.upsert_post_rating(
  p_post_id text,
  p_kind text,
  p_stars integer
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  actor uuid := (select auth.uid());
  v_sum double precision;
  v_count integer;
  v_mine integer;
begin
  if actor is null then
    raise exception 'not authenticated';
  end if;
  if p_post_id is null or length(trim(p_post_id)) = 0 then
    raise exception 'invalid post';
  end if;
  if p_kind is null or p_kind not in ('elegance', 'aha') then
    raise exception 'invalid kind';
  end if;

  if p_stars is null or p_stars = 0 then
    delete from public.post_ratings
    where user_id = actor and post_id = p_post_id and kind = p_kind;
  else
    if p_stars < 1 or p_stars > 5 then
      raise exception 'invalid stars';
    end if;
    insert into public.post_ratings (user_id, post_id, kind, stars)
    values (actor, p_post_id, p_kind, p_stars)
    on conflict (user_id, post_id, kind)
    do update set stars = excluded.stars, updated_at = now();
  end if;

  select coalesce(sum(stars), 0), count(*)::integer,
         max(stars) filter (where user_id = actor)
    into v_sum, v_count, v_mine
    from public.post_ratings
    where post_id = p_post_id and kind = p_kind;

  return jsonb_build_object(
    'ok', true,
    'post_id', p_post_id,
    'kind', p_kind,
    'rating_sum', v_sum,
    'rating_count', v_count,
    'my_stars', coalesce(v_mine, 0)
  );
end;
$$;

revoke all on function public.upsert_post_rating(text, text, integer) from public, anon;
grant execute on function public.upsert_post_rating(text, text, integer) to authenticated;
