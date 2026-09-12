-- Signup profile creation must not depend on can_use_app() (developer/early-access).
-- Recreates INSERT/UPDATE policies (idempotent with 20260912050000) and adds a
-- security-definer RPC that only writes auth.uid(). No profile row rewrites.

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

create or replace function public.ensure_my_profile(p_name text default null, p_handle text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := (select auth.uid());
  claimed text;
  rec public.profiles;
begin
  if uid is null then
    raise exception 'NOT_AUTH';
  end if;

  claimed := nullif(btrim(coalesce(p_handle, '')), '');
  if claimed is not null and lower(claimed) = 'advertisement' then
    claimed := null;
  end if;
  if claimed is not null and claimed !~ '^[A-Za-z0-9_]{3,20}$' then
    claimed := null;
  end if;

  begin
    insert into public.profiles (id, name, handle, is_sample)
    values (
      uid,
      coalesce(nullif(btrim(coalesce(p_name, '')), ''), ''),
      claimed,
      false
    )
    on conflict (id) do update
      set name = case
        when public.profiles.name = '' then excluded.name
        else public.profiles.name
      end,
      handle = coalesce(public.profiles.handle, excluded.handle);
  exception
    when unique_violation then
      insert into public.profiles (id, name, handle, is_sample)
      values (uid, coalesce(nullif(btrim(coalesce(p_name, '')), ''), ''), null, false)
      on conflict (id) do update
        set name = case
          when public.profiles.name = '' then excluded.name
          else public.profiles.name
        end;
  end;

  select * into rec from public.profiles where id = uid;
  return jsonb_build_object(
    'id', rec.id,
    'name', rec.name,
    'handle', rec.handle,
    'isSample', coalesce(rec.is_sample, false)
  );
end;
$$;

revoke all on function public.ensure_my_profile(text, text) from public, anon;
grant execute on function public.ensure_my_profile(text, text) to authenticated;
