-- is_admin() must not rely only on JWT email claims (some sessions omit email).
-- Match the authenticated user's auth.users.email against admin_allowlist.

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
