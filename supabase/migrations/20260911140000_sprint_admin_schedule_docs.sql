-- Idempotent alignment with the already-applied remote sprint_pulse_schedule.
-- Does not drop data. Safe to run on projects that already have these objects.

alter table public.problems
  add column if not exists publish_at timestamptz;

alter table public.problems
  add column if not exists topic text;

create or replace function public.jst_today()
returns date
language sql
stable
set search_path to 'public'
as $$
  select (timezone('Asia/Tokyo', now()))::date
$$;

create or replace function public.sprint_opens_at(p_day date)
returns timestamptz
language sql
immutable
set search_path to 'public'
as $$
  select (p_day::timestamp + time '21:00') at time zone 'Asia/Tokyo'
$$;

create or replace function public.sprint_closes_at(p_day date)
returns timestamptz
language sql
immutable
set search_path to 'public'
as $$
  select public.sprint_opens_at(p_day) + interval '10 minutes'
$$;

create unique index if not exists problems_sprint_day_unique
  on public.problems (sprint_day)
  where is_sprint and sprint_day is not null;

create index if not exists problems_publish_at_idx
  on public.problems (publish_at desc);

create table if not exists public.sprint_secrets (
  problem_id uuid primary key references public.problems (id) on delete cascade,
  correct_answer text,
  explanation text,
  hint text,
  updated_at timestamptz not null default now()
);

alter table public.sprint_secrets enable row level security;
revoke all on public.sprint_secrets from anon, authenticated;

create table if not exists public.sprint_attempts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  solver_answer text,
  submitted_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

alter table public.sprint_attempts enable row level security;
