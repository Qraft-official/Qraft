-- Referral fraud review columns + atomic reward claiming.
-- Existing Welcome Mission targets (3 solves / 3 posts / 3-day login) stay enforced in app + try_complete.

alter table public.referral_claims
  add column if not exists status text not null default 'pending',
  add column if not exists risk_score integer,
  add column if not exists risk_reasons jsonb,
  add column if not exists network_hash text,
  add column if not exists reviewed_at timestamptz;

alter table public.referral_claims drop constraint if exists referral_claims_status_check;
alter table public.referral_claims
  add constraint referral_claims_status_check
  check (status in ('pending', 'allowed', 'held', 'rejected', 'rewarded'));

update public.referral_claims
  set status = 'rewarded'
  where discount_awarded_at is not null and status = 'pending';

create table if not exists public.referral_network_sightings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  network_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists referral_network_sightings_hash_created_idx
  on public.referral_network_sightings (network_hash, created_at desc);

alter table public.referral_network_sightings enable row level security;
revoke all on public.referral_network_sightings from public, anon, authenticated;

create table if not exists public.referral_activity_events (
  id uuid primary key default gen_random_uuid(),
  referee_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('login', 'solve', 'post')),
  created_at timestamptz not null default now()
);

create index if not exists referral_activity_events_referee_idx
  on public.referral_activity_events (referee_id, created_at desc);

alter table public.referral_activity_events enable row level security;
revoke all on public.referral_activity_events from public, anon, authenticated;

create or replace function public.protect_referral_claim_fraud_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('service_role', 'postgres') then
    return NEW;
  end if;
  if TG_OP = 'INSERT' then
    NEW.status := 'pending';
    NEW.risk_score := null;
    NEW.risk_reasons := null;
    NEW.network_hash := null;
    NEW.reviewed_at := null;
    NEW.discount_awarded_at := null;
    return NEW;
  end if;
  NEW.status := OLD.status;
  NEW.risk_score := OLD.risk_score;
  NEW.risk_reasons := OLD.risk_reasons;
  NEW.network_hash := OLD.network_hash;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.discount_awarded_at := OLD.discount_awarded_at;
  return NEW;
end;
$$;

drop trigger if exists trg_protect_referral_claim_fraud_columns on public.referral_claims;
create trigger trg_protect_referral_claim_fraud_columns
before insert or update on public.referral_claims
for each row
execute function public.protect_referral_claim_fraud_columns();

revoke all on function public.protect_referral_claim_fraud_columns() from public, anon, authenticated;

-- Atomic mission counters. Targets remain 3/3/3 to match WELCOME_* constants.
create or replace function public.apply_referral_mission_event(
  p_referee_id uuid,
  p_event_type text
)
returns public.referral_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.referral_claims;
  today date := (timezone('Asia/Tokyo', now()))::date;
  yday date := ((timezone('Asia/Tokyo', now()))::date - 1);
begin
  if p_event_type not in ('login', 'solve', 'post') then
    raise exception 'bad event';
  end if;

  select * into row
  from public.referral_claims
  where referee_id = p_referee_id
  for update;
  if not found then
    return null;
  end if;

  if row.completed_at is not null or row.expired_at is not null then
    return row;
  end if;

  if now() > row.mission_deadline then
    update public.referral_claims
      set expired_at = coalesce(expired_at, now())
      where referee_id = p_referee_id
      returning * into row;
    return row;
  end if;

  if p_event_type = 'solve' then
    update public.referral_claims
      set solves = solves + 1
      where referee_id = p_referee_id
      returning * into row;
  elsif p_event_type = 'post' then
    update public.referral_claims
      set posts = posts + 1
      where referee_id = p_referee_id
      returning * into row;
  elsif p_event_type = 'login' then
    if row.last_login_date is distinct from today then
      update public.referral_claims
        set login_streak = case
              when row.last_login_date = yday then row.login_streak + 1
              else 1
            end,
            last_login_date = today
        where referee_id = p_referee_id
        returning * into row;
    end if;
  end if;

  return row;
end;
$$;

revoke all on function public.apply_referral_mission_event(uuid, text) from public, anon, authenticated;

create or replace function public.try_complete_referral_mission(p_referee_id uuid)
returns public.referral_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.referral_claims;
begin
  update public.referral_claims
    set completed_at = now()
    where referee_id = p_referee_id
      and completed_at is null
      and expired_at is null
      and now() <= mission_deadline
      and solves >= 3
      and posts >= 3
      and login_streak >= 3
  returning * into row;

  if found then
    return row;
  end if;

  select * into row from public.referral_claims where referee_id = p_referee_id;
  return row;
end;
$$;

revoke all on function public.try_complete_referral_mission(uuid) from public, anon, authenticated;

create or replace function public.try_finalize_referral_claim(
  p_referee_id uuid,
  p_status text,
  p_risk_score integer,
  p_risk_reasons jsonb,
  p_network_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int := 0;
begin
  if p_status not in ('rewarded', 'held', 'rejected', 'allowed') then
    raise exception 'bad status';
  end if;

  if p_status = 'rewarded' then
    update public.referral_claims
      set status = 'rewarded',
          discount_awarded_at = now(),
          reviewed_at = now(),
          risk_score = p_risk_score,
          risk_reasons = p_risk_reasons,
          network_hash = coalesce(p_network_hash, network_hash)
      where referee_id = p_referee_id
        and completed_at is not null
        and expired_at is null
        and discount_awarded_at is null
        and status in ('pending', 'allowed');
    get diagnostics updated = row_count;
    return updated = 1;
  end if;

  update public.referral_claims
    set status = p_status,
        reviewed_at = now(),
        risk_score = p_risk_score,
        risk_reasons = p_risk_reasons,
        network_hash = coalesce(p_network_hash, network_hash)
    where referee_id = p_referee_id
      and completed_at is not null
      and discount_awarded_at is null
      and status = 'pending';
  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;

revoke all on function public.try_finalize_referral_claim(uuid, text, integer, jsonb, text)
  from public, anon, authenticated;
