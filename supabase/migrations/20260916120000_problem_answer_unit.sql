-- Optional display unit for Aha / Challenger answers (not used for PULSE secrets).
-- Do not store the unit inside correct_answer going forward.
-- Safe to apply later; this file is not auto-applied to production.

alter table public.problems
  add column if not exists answer_unit text;

alter table public.problems
  drop constraint if exists problems_answer_unit_len;

alter table public.problems
  add constraint problems_answer_unit_len
  check (answer_unit is null or char_length(btrim(answer_unit)) <= 12);

comment on column public.problems.answer_unit is
  'Optional unit shown beside the solver input. Grading uses correct_answer only.';
