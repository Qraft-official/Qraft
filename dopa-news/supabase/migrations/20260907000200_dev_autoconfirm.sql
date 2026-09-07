-- =====================================================================
-- Development convenience: auto-confirm new sign-ups.
--
-- A fresh Supabase project has "Confirm email" enabled and the built-in
-- mailer is heavily rate limited, which makes email sign-up unusable
-- before an SMTP provider is configured. This trigger stamps
-- email_confirmed_at so signUp() returns a session immediately.
--
-- BEFORE A REAL LAUNCH: configure SMTP, then run
--   drop trigger dopa_dev_autoconfirm on auth.users;
--   drop function public.dev_autoconfirm_user();
-- =====================================================================

create or replace function public.dev_autoconfirm_user()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists dopa_dev_autoconfirm on auth.users;
create trigger dopa_dev_autoconfirm
  before insert on auth.users
  for each row execute function public.dev_autoconfirm_user();
