-- Guests may read listed problem bodies, not answers or seed internals.
-- Authenticated retains table-level SELECT for the logged-in app.

revoke select on table public.problems from anon;

grant select (
  id,
  title,
  problem_text,
  subject,
  photo,
  is_sprint,
  sprint_day,
  created_at,
  pages,
  problem_format,
  mode,
  difficulty_level,
  publish_at,
  topic
) on table public.problems to anon;
