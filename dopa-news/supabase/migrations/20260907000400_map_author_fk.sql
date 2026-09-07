-- =====================================================================
-- Lets PostgREST embed a map post's author profile in one round trip.
-- `user_id` already references auth.users; profiles.id is a 1:1 mirror of
-- that table, so this second key is safe and purely for the API shape.
-- =====================================================================

alter table public.map_posts
  drop constraint if exists map_posts_author_profile_fkey;

alter table public.map_posts
  add constraint map_posts_author_profile_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;
