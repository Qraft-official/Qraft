-- Anon SELECT on problems was failing with:
--   permission denied for function is_admin
-- because "problems are readable" OR'd `is_admin()` into a policy granted to anon,
-- while EXECUTE on is_admin is revoked from anon (intentional).
-- Postgres still evaluates that term, so guests could not read listed regular problems.
-- Split: listed content for anon+authenticated; unpublished PULSE preview for admins only.

drop policy if exists "problems are readable" on public.problems;
drop policy if exists "listed problems are readable" on public.problems;
drop policy if exists "admins can read unpublished sprints" on public.problems;

create policy "listed problems are readable"
  on public.problems for select
  to anon, authenticated
  using (
    (
      not coalesce(is_sprint, false)
      and (publish_at is null or now() >= publish_at)
    )
    or (
      coalesce(is_sprint, false)
      and sprint_day is not null
      and publish_at is not null
      and now() >= publish_at
    )
  );

create policy "admins can read unpublished sprints"
  on public.problems for select
  to authenticated
  using (
    coalesce(is_sprint, false)
    and public.is_admin()
  );
