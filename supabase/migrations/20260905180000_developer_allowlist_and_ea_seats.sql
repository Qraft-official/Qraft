-- Trusted developers/admins for launch access.
-- Reuses public.admin_allowlist (JWT email match via is_admin()).
-- Does not create Auth users. After these emails sign up, is_admin() becomes true.
-- Seat count for Early Access excludes allowlisted developers and sample profiles.

insert into public.admin_allowlist (email)
values
  ('shougay1919@gmail.com'),
  ('sentaiyi590@gmail.com'),
  ('qraft.study@gmail.com'),
  ('njbk1rktdn@sute.jp')
on conflict (email) do nothing;

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
  join public.profiles p on p.id = m.user_id
  join auth.users u on u.id = m.user_id
  where not coalesce(p.is_sample, false)
    and not exists (
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

  if exists (
    select 1 from public.profiles p
    where p.id = p_user_id and coalesce(p.is_sample, false)
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_open');
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
