-- Allow explicit exact-match alternatives without weakening answer comparison.
alter table public.problems
  add column if not exists accepted_answers jsonb;

update public.problems
set accepted_answers = '[]'::jsonb
where accepted_answers is null;

alter table public.problems
  alter column accepted_answers set default '[]'::jsonb,
  alter column accepted_answers set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'problems_accepted_answers_array_check'
      and conrelid = 'public.problems'::regclass
  ) then
    alter table public.problems
      add constraint problems_accepted_answers_array_check
      check (jsonb_typeof(accepted_answers) = 'array');
  end if;
end $$;

-- This prompt asks whether C can infer the color; accept the concise yes/no
-- response while retaining the richer canonical answer and explanation.
update public.problems
set accepted_answers = accepted_answers || '["分かる"]'::jsonb
where id = 'e0704192-f8b6-57f9-880c-a3ac4498a0ca'
  and title = '『分からない』がヒント'
  and mode = 'aha'
  and not is_sprint
  and correct_answer = '分かる。赤'
  and not (accepted_answers @> '["分かる"]'::jsonb);