-- Run in Supabase Dashboard → SQL Editor (as a project owner).
-- Does NOT create Auth users. It only registers trusted developer emails
-- on public.admin_allowlist. is_admin() matches the authenticated JWT email.
--
-- After this runs:
-- - If the Auth user already exists, they are an admin/developer on next login / RPC.
-- - If they have not signed up yet, the same email will become admin automatically
--   the first time they register and confirm that address.
--
-- Clients cannot write this table (RLS + revoke). Do not put these emails in NEXT_PUBLIC_*.

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
