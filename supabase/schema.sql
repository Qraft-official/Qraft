-- Qraft problems + profiles
-- Run this in the Supabase SQL Editor (Dashboard → SQL).
-- Enables Auth-backed posting, public timeline reads, and the 21:00 sprint flag.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  handle text unique,
  age integer check (age is null or age >= 0),
  onboarded boolean not null default false,
  math_tier smallint not null default 1 check (math_tier between 1 and 5),
  physics_tier smallint not null default 1 check (physics_tier between 1 and 5),
  chemistry_tier smallint not null default 1 check (chemistry_tier between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  problem_text text not null,
  solution text,
  subject text not null default 'math'
    check (subject in ('math', 'physics', 'chemistry')),
  photo text,
  is_sprint boolean not null default false,
  sprint_day date,
  created_at timestamptz not null default now()
);

create index if not exists problems_created_at_idx
  on public.problems (created_at desc);

create index if not exists problems_author_id_idx
  on public.problems (author_id);

create index if not exists problems_sprint_idx
  on public.problems (is_sprint, created_at desc)
  where is_sprint;

create table if not exists public.admin_allowlist (
  email text primary key
);

alter table public.admin_allowlist enable row level security;
revoke all on public.admin_allowlist from anon, authenticated;

insert into public.admin_allowlist (email)
values ('shougay1919@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_allowlist a
    where lower(a.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
  or coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin';
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.problems enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "problems are readable" on public.problems;
create policy "problems are readable"
  on public.problems for select
  to anon, authenticated
  using (true);

drop policy if exists "users can insert own problems" on public.problems;
drop policy if exists "admins can insert problems" on public.problems;
create policy "admins can insert problems"
  on public.problems for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_admin()
  );

drop policy if exists "users can update own problems" on public.problems;
drop policy if exists "admins can update problems" on public.problems;
create policy "admins can update problems"
  on public.problems for update
  to authenticated
  using (public.is_admin())
  with check (
    author_id = (select auth.uid())
    and public.is_admin()
  );

drop policy if exists "users can delete own problems" on public.problems;
drop policy if exists "admins can delete problems" on public.problems;
create policy "admins can delete problems"
  on public.problems for delete
  to authenticated
  using (public.is_admin());

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.problems to anon, authenticated;
grant insert, update, delete on public.problems to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'handle', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.problems replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.problems;
exception
  when duplicate_object then null;
end $$;

