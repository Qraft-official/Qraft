-- =====================================================================
-- Self-service account deletion.
--
-- Deleting a user normally needs the service_role key, which must never
-- reach the browser. This definer function only ever removes the row that
-- belongs to auth.uid(); every other table cascades from auth.users.
-- =====================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
