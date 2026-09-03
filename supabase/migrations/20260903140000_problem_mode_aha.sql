-- Allow Aha! problem mode (elementary insight / puzzle problems).

alter table public.problems drop constraint if exists problems_mode_check;
alter table public.problems
  add constraint problems_mode_check check (mode in ('question', 'challenge', 'aha'));
