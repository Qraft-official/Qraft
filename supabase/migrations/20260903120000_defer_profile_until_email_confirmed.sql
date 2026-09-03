-- Defer public.profiles (and unique handle) until email is confirmed.
-- Recycle abandoned unconfirmed auth.users so the same email/handle can be reused.

create or replace function public.is_email_confirmed()
returns boolean
language sql
stable
security definer
set search_path = auth
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and email_confirmed_at is not null
  );
$$;

revoke all on function public.is_email_confirmed() from public, anon;
grant execute on function public.is_email_confirmed() to authenticated;

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()) and public.is_email_confirmed());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_handle text;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  claimed_handle := nullif(btrim(new.raw_user_meta_data ->> 'handle'), '');
  if claimed_handle is not null and lower(claimed_handle) = 'advertisement' then
    claimed_handle := null;
  end if;
  if claimed_handle is not null and claimed_handle !~ '^[A-Za-z0-9_]{3,20}$' then
    claimed_handle := null;
  end if;

  begin
    insert into public.profiles (id, name, handle)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'name', ''),
      claimed_handle
    )
    on conflict (id) do update
      set name = case
        when public.profiles.name = '' then excluded.name
        else public.profiles.name
      end,
      handle = coalesce(public.profiles.handle, excluded.handle);
  exception
    when unique_violation then
      insert into public.profiles (id, name, handle)
      values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), null)
      on conflict (id) do nothing;
  end;

  insert into public.notifications (user_id, title, message)
  select
    new.id,
    '🎉 Qraftへようこそ！',
    E'Qraft（クラフト）をご利用いただきありがとうございます！\nみんなで問題を出し合ったり、手書きや数式エディタで解法をシェアして楽しんでくださいね。\n\n【iPhone / iPad（iOS）をご利用の方へ】\n現在、開発者の環境都合によりネイティブアプリ版はAndroid限定公開となっています。\nApple端末（iOS）をご利用の方は、Webブラウザ（SafariやChromeなど）から快適にご利用いただけます！'
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = new.id
      and n.title = '🎉 Qraftへようこそ！'
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.recycle_unconfirmed_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  claimed_handle text;
begin
  claimed_handle := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'handle', '')), '');

  delete from auth.users u
  where u.email_confirmed_at is null
    and u.id is distinct from new.id
    and (
      (new.email is not null and lower(u.email) = lower(new.email))
      or (
        claimed_handle is not null
        and lower(coalesce(u.raw_user_meta_data ->> 'handle', '')) = lower(claimed_handle)
      )
    );

  return new;
end;
$$;

revoke all on function public.recycle_unconfirmed_auth_user() from public, anon, authenticated;

drop trigger if exists trg_recycle_unconfirmed_auth_user on auth.users;
create trigger trg_recycle_unconfirmed_auth_user
  before insert on auth.users
  for each row execute function public.recycle_unconfirmed_auth_user();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_new_user();

delete from public.profiles p
using auth.users u
where p.id = u.id
  and u.email_confirmed_at is null;
