-- Add missing hints column (app already writes it). Reuse problems.solution as explanation.
-- Grant guests study fields on listed rows only (RLS). Never grant correct_answer or sprint_secrets.

alter table public.problems
  add column if not exists hints jsonb not null default '[]'::jsonb;

grant select (hints, solution) on table public.problems to anon;

create or replace function public.listed_problem_study(p_id uuid)
returns table (hints jsonb, explanation text)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when coalesce(p.is_sprint, false) then
        case
          when nullif(btrim(coalesce(s.hint, '')), '') is null then '[]'::jsonb
          else jsonb_build_array(btrim(s.hint))
        end
      else coalesce(p.hints, '[]'::jsonb)
    end,
    case
      when coalesce(p.is_sprint, false) then nullif(btrim(coalesce(s.explanation, '')), '')
      else nullif(btrim(coalesce(p.solution, '')), '')
    end
  from public.problems p
  left join public.sprint_secrets s on s.problem_id = p.id
  where p.id = p_id
    and (
      (
        not coalesce(p.is_sprint, false)
        and (p.publish_at is null or now() >= p.publish_at)
      )
      or (
        coalesce(p.is_sprint, false)
        and p.sprint_day is not null
        and p.publish_at is not null
        and now() >= p.publish_at
      )
    );
$$;

revoke all on function public.listed_problem_study(uuid) from public;
grant execute on function public.listed_problem_study(uuid) to anon, authenticated;
