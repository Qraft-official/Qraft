-- Live DB still has CHECK (mode IN ('question', 'challenge')).
-- Repo already has 20260903140000_problem_mode_aha.sql but it was not applied remotely.
-- Recreate the constraint with the full app mode union. Do not drop existing values.

alter table public.problems drop constraint if exists problems_mode_check;
alter table public.problems
  add constraint problems_mode_check
  check (mode in ('question', 'challenge', 'aha'));
