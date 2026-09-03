-- Replace IP-based invite limits with per-account + per-device uniqueness.

create table if not exists public.referral_claims (
  referee_id uuid primary key references public.profiles (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  device_id text not null check (char_length(device_id) >= 8 and char_length(device_id) <= 128),
  device_fingerprint text check (
    device_fingerprint is null
    or (char_length(device_fingerprint) >= 16 and char_length(device_fingerprint) <= 128)
  ),
  applied_at timestamptz not null default now(),
  mission_deadline timestamptz not null,
  trial_until timestamptz not null,
  solves integer not null default 0,
  posts integer not null default 0,
  login_streak integer not null default 1,
  last_login_date date,
  completed_at timestamptz,
  expired_at timestamptz,
  discount_awarded_at timestamptz,
  constraint referral_claims_no_self check (referee_id <> referrer_id)
);

alter table public.referral_claims
  add column if not exists device_fingerprint text;

do $$
begin
  alter table public.referral_claims
    add constraint referral_claims_no_self check (referee_id <> referrer_id);
exception
  when duplicate_object then null;
end $$;

create unique index if not exists referral_claims_device_id_uidx
  on public.referral_claims (device_id);

create unique index if not exists referral_claims_device_fingerprint_uidx
  on public.referral_claims (device_fingerprint)
  where device_fingerprint is not null;

alter table public.referral_claims enable row level security;
revoke all on public.referral_claims from anon, authenticated;

drop index if exists referral_apply_log_ip_created_idx;
drop index if exists referral_apply_log_ip_success_idx;
drop table if exists public.referral_apply_log;
