-- V2 Phase 4 planned vs actual: anyone in the household marks a planned item done (with the real times) or not done.
-- The planned time stays untouched; the website ignores these columns.
alter table public.planner_entries
  add column if not exists outcome text check (outcome in ('done', 'not_done')),
  add column if not exists actual_start text,
  add column if not exists actual_end text,
  add column if not exists outcome_by uuid,
  add column if not exists outcome_at timestamptz;

-- Writes only the outcome columns, only for today or earlier (UK date), never for shift changes or days off.
-- _outcome null clears a mistake.
create or replace function public.record_outcome(_id uuid, _outcome text, _start text default null, _end text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if _outcome is not null and _outcome not in ('done', 'not_done') then return false; end if;
  update planner_entries set
    outcome = _outcome,
    actual_start = case when _outcome = 'done' then left(nullif(trim(_start), ''), 20) end,
    actual_end = case when _outcome = 'done' then left(nullif(trim(_end), ''), 20) end,
    outcome_by = case when _outcome is not null then auth.uid() end,
    outcome_at = case when _outcome is not null then now() end
   where id = _id and entry_type not in ('shift_change', 'school_holiday', 'inset_day')
     and entry_date <= (now() at time zone 'Europe/London')::date
     and household_side(family_id) is not null;
  return found;
end $$;

revoke execute on function public.record_outcome(uuid, text, text, text) from public, anon;
grant execute on function public.record_outcome(uuid, text, text, text) to authenticated, service_role;
