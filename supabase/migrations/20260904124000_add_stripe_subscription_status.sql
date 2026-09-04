-- Stripe subscription state for server-side Premium checks.
-- Billing columns are writable only via the service role (webhooks).

alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists premium_status text,
  add column if not exists premium_current_period_end timestamptz;

alter table public.profiles drop constraint if exists profiles_premium_status_check;
alter table public.profiles
  add constraint profiles_premium_status_check
  check (
    premium_status is null
    or premium_status in (
      'active',
      'trialing',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused',
      'inactive'
    )
  );

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists profiles_stripe_subscription_id_idx
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

create or replace function public.protect_profile_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return NEW;
  end if;
  if TG_OP = 'INSERT' then
    NEW.stripe_customer_id := null;
    NEW.stripe_subscription_id := null;
    NEW.premium_status := null;
    NEW.premium_current_period_end := null;
    return NEW;
  end if;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  NEW.premium_status := OLD.premium_status;
  NEW.premium_current_period_end := OLD.premium_current_period_end;
  return NEW;
end;
$$;

drop trigger if exists trg_protect_profile_billing_columns on public.profiles;
create trigger trg_protect_profile_billing_columns
before insert or update on public.profiles
for each row
execute function public.protect_profile_billing_columns();

revoke all on function public.protect_profile_billing_columns() from public, anon, authenticated;
