-- =====================================================================
-- Development-only vote baselines.
--
-- Sample articles ship with a plausible distribution so the result bars in
-- the prediction quiz are readable before the app has an audience. Real
-- articles leave these columns at 0, in which case `votes_*` reflects only
-- genuine ballots from `news_votes`.
-- =====================================================================

alter table public.news_quizzes add column if not exists sample_votes_a integer not null default 0;
alter table public.news_quizzes add column if not exists sample_votes_b integer not null default 0;
alter table public.news_quizzes add column if not exists sample_votes_c integer not null default 0;

create or replace function public.sync_quiz_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.quiz_id, old.quiz_id);
  update public.news_quizzes q
  set votes_a = q.sample_votes_a
        + (select count(*) from public.news_votes v where v.quiz_id = target and v.selected_option = 'A'),
      votes_b = q.sample_votes_b
        + (select count(*) from public.news_votes v where v.quiz_id = target and v.selected_option = 'B'),
      votes_c = q.sample_votes_c
        + (select count(*) from public.news_votes v where v.quiz_id = target and v.selected_option = 'C')
  where q.id = target;
  return null;
end;
$$;
