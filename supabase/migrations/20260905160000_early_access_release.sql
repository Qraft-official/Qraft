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
