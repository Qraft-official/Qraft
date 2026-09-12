-- Completes signup/onboarding without developer/early-access checks on
-- profiles writes. Does not rewrite existing profile rows.

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (
    id = (select auth.uid())
    and coalesce(is_sample, false) = false
  );

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and coalesce(is_sample, false) = false
  );

create or replace function public.save_my_learning_profile(
  p_age integer,
  p_math integer,
  p_physics integer,
  p_chemistry integer,
  p_onboarded boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := (select auth.uid());
  rec public.profiles;
  math_t int := greatest(1, least(5, coalesce(p_math, 1)));
  phys_t int := greatest(1, least(5, coalesce(p_physics, 1)));
  chem_t int := greatest(1, least(5, coalesce(p_chemistry, 1)));
begin
  if uid is null then
    raise exception 'NOT_AUTH';
  end if;

  insert into public.profiles (id, name, handle, is_sample, age, math_tier, physics_tier, chemistry_tier, onboarded)
  values (
    uid,
    '',
    null,
    false,
    p_age,
    math_t,
    phys_t,
    chem_t,
    coalesce(p_onboarded, false)
  )
  on conflict (id) do update
    set
      age = excluded.age,
      math_tier = excluded.math_tier,
      physics_tier = excluded.physics_tier,
      chemistry_tier = excluded.chemistry_tier,
      onboarded = coalesce(p_onboarded, public.profiles.onboarded);

  select * into rec from public.profiles where id = uid;
  return jsonb_build_object(
    'id', rec.id,
    'onboarded', rec.onboarded,
    'isSample', coalesce(rec.is_sample, false)
  );
end;
$$;

revoke all on function public.save_my_learning_profile(integer, integer, integer, integer, boolean) from public, anon;
grant execute on function public.save_my_learning_profile(integer, integer, integer, integer, boolean) to authenticated;
