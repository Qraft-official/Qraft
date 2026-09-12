-- Fix profiles INSERT/UPDATE RLS so confirmed users can create their own
-- non-sample profile. Clients cannot set is_sample = true.
-- Does not UPDATE/DELETE existing profile rows.

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (
    id = (select auth.uid())
    and coalesce(is_sample, false) = false
  );

-- Own-row updates must not require can_use_app(): during early access that
-- blocked signup upsert/patch after handle_new_user inserted the row.
-- Sample flag cannot be flipped by the client.
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and coalesce(is_sample, false) = false
  );
