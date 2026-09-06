-- Align can_use_app() with developer-first launch rules and expose a single
-- server-side access snapshot. Does not create Auth users.
--
-- Rules:
--   trusted developer (admin_allowlist matched via auth.uid()) → ALLOW
--   else if now < 2026-09-12 00:00 JST → BLOCK
--   else if now < 2026-09-19 00:00 JST → early_access_members ALLOW else BLOCK
--   else → ALLOW
--
-- Developers never occupy Early Access seats (early_access_seat_count already
-- excludes admin_allowlist emails).

insert into public.admin_allowlist (email)
values
  ('shougay1919@gmail.com'),
  ('sentaiyi590@gmail.com'),
  ('qraft.study@gmail.com'),
  ('njbk1rktdn@sute.jp')
on conflict (email) do nothing;

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
    or (
      public.release_phase() = 'early'
      and exists (
        select 1
        from public.early_access_members m
        where m.user_id = (select auth.uid())
      )
    );
$$;

revoke all on function public.can_use_app() from public, anon;
grant execute on function public.can_use_app() to authenticated, service_role;

create or replace function public.get_my_access_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  uid uuid := (select auth.uid());
  phase text := public.release_phase();
  developer boolean := false;
  member boolean := false;
begin
  if uid is not null then
    developer := public.is_admin() or public.user_is_trusted_developer(uid);
    member := exists (
      select 1 from public.early_access_members m where m.user_id = uid
    );
  end if;

  return jsonb_build_object(
    'phase', phase,
    'authenticated', uid is not null,
    'is_developer', developer,
    'is_member', member,
    'allowed',
      developer
      or phase = 'public'
      or (phase = 'early' and member)
  );
end;
$$;

revoke all on function public.get_my_access_state() from public, anon;
grant execute on function public.get_my_access_state() to authenticated, service_role;
