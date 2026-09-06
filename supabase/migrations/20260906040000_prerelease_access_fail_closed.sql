-- Pre-release access: developers via admin_allowlist + auth.users email.
-- SELECT of feed data requires can_use_app() until public release.
-- Fail closed: cannot mark a user as developer without a DB allowlist match.

insert into public.admin_allowlist (email)
values
  ('shougay1919@gmail.com'),
  ('sentaiyi590@gmail.com'),
  ('qraft.study@gmail.com'),
  ('njbk1rktdn@sute.jp')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    exists (
      select 1
      from public.admin_allowlist a
      where lower(a.email) = lower(coalesce(
        (select u.email from auth.users u where u.id = auth.uid()),
        (select auth.jwt() ->> 'email'),
        ''
      ))
    )
    or coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin';
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

create or replace function public.user_is_trusted_developer(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p_user_id is not null
    and exists (
      select 1
      from auth.users u
      join public.admin_allowlist a on lower(a.email) = lower(u.email)
      where u.id = p_user_id
    );
$$;

revoke all on function public.user_is_trusted_developer(uuid) from public, anon;
grant execute on function public.user_is_trusted_developer(uuid) to authenticated, service_role;

create or replace function public.early_access_seat_count()
returns integer
language sql
stable
security definer
set search_path = public, auth
as $$
  select count(*)::int
  from public.early_access_members m
  join auth.users u on u.id = m.user_id
  where not exists (
    select 1
    from public.admin_allowlist a
    where lower(a.email) = lower(u.email)
  );
$$;

revoke all on function public.early_access_seat_count() from public, anon, authenticated;
grant execute on function public.early_access_seat_count() to service_role;

create or replace function public.can_use_app()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or public.user_is_trusted_developer((select auth.uid()))
    or public.app_is_public_release()
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
set search_path = public, auth
as $$
declare
  normalized text;
  cap integer;
  n integer;
  valid boolean;
begin
  if public.user_is_trusted_developer(p_user_id) then
    return jsonb_build_object('ok', true, 'reason', 'developer');
  end if;

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
  n := public.early_access_seat_count();
  if n >= cap then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  insert into public.early_access_members (user_id, invite_code)
  values (p_user_id, normalized)
  on conflict (user_id) do nothing;

  if not exists (select 1 from public.early_access_members where user_id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  return jsonb_build_object('ok', true, 'reason', 'enrolled');
end;
$$;

revoke all on function public.try_enroll_early_access(uuid, text) from public, anon, authenticated;
grant execute on function public.try_enroll_early_access(uuid, text) to service_role;

drop policy if exists "problems are readable" on public.problems;
create policy "problems are readable"
  on public.problems for select
  to anon, authenticated
  using (
    (public.app_is_public_release() or public.can_use_app())
    and (
      publish_at is null
      or publish_at <= now()
      or author_id = (select auth.uid())
      or public.is_admin()
    )
  );

drop policy if exists "comments are readable" on public.comments;
create policy "comments are readable"
  on public.comments for select
  to anon, authenticated
  using (public.app_is_public_release() or public.can_use_app());

drop policy if exists "problem reactions are readable" on public.problem_reactions;
create policy "problem reactions are readable"
  on public.problem_reactions for select
  to anon, authenticated
  using (public.app_is_public_release() or public.can_use_app());

drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable"
  on public.profiles for select
  to anon, authenticated
  using (
    public.app_is_public_release()
    or public.can_use_app()
    or id = (select auth.uid())
  );
