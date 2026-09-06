-- Run in Supabase Dashboard → SQL Editor (as a project owner) if this
-- environment has not applied supabase/migrations/20260906043000_developer_first_can_use_app.sql
--
-- Does NOT create Auth users.
-- Trusted developers = auth.users.id whose email is on public.admin_allowlist.
-- is_admin() / user_is_trusted_developer(uid) are the only access sources.
-- Clients cannot write admin_allowlist (RLS + revoke).

insert into public.admin_allowlist (email)
values
  ('shougay1919@gmail.com'),
  ('sentaiyi590@gmail.com'),
  ('qraft.study@gmail.com'),
  ('njbk1rktdn@sute.jp')
on conflict (email) do nothing;

-- Status of the four addresses (auth user present or not)
select
  a.email,
  u.id as auth_user_id,
  u.email_confirmed_at,
  public.user_is_trusted_developer(u.id) as db_developer,
  case
    when u.id is null then 'not_registered_yet'
    when u.email_confirmed_at is null then 'registered_unconfirmed'
    else 'active_developer'
  end as status
from (
  values
    ('shougay1919@gmail.com'),
    ('sentaiyi590@gmail.com'),
    ('qraft.study@gmail.com'),
    ('njbk1rktdn@sute.jp')
) as a(email)
left join auth.users u on lower(u.email) = lower(a.email)
order by a.email;
