-- Open Qraft to the public on 2026-09-16 (JST).
-- Keeps release_schedule / can_use_app / admin allowlist / early_access tables.
-- Only moves public_release_at earlier so release_phase() = 'public'.

update public.release_schedule
set public_release_at = timestamptz '2026-09-16 00:00:00+09'
where id = 1
  and public_release_at > timestamptz '2026-09-16 00:00:00+09';

-- Guest SELECT on profiles uses app_is_public_release() OR can_use_app().
-- Postgres evaluates both, so anon must be able to EXECUTE can_use_app().
grant execute on function public.can_use_app() to anon;
grant execute on function public.app_is_public_release() to anon;
