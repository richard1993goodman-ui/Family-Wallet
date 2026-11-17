-- V2 Phase 4: edit a calendar item, or this and every later week of a weekly series (agreed 14 Nov).
-- Same rule as removing: parents edit anything, staff only items they added. Only what/when/who/notes change;
-- never the household, the day, the type, who added it, or approvals. Shift changes are not editable
-- (remove and re-add, so the other side approves again). Returns how many rows changed.
create or replace function public.edit_planner_entry(
  _id uuid, _after boolean, _title text, _time text, _end text, _child text, _nanny uuid, _notes text
) returns integer language plpgsql security definer set search_path = public as $$
declare e planner_entries; n integer;
begin
  select * into e from planner_entries where id = _id;
  if not found or e.entry_type = 'shift_change' then return 0; end if;
  if not (is_household_owner(e.family_id) or (my_staff_nanny(e.family_id) is not null and e.created_by = auth.uid())) then return 0; end if;
  if _nanny is not null and not exists (select 1 from family_nannies where id = _nanny and family_id = e.family_id) then return 0; end if;
  update planner_entries set
    title = coalesce(left(nullif(trim(_title), ''), 160), title),
    time_label = left(nullif(trim(_time), ''), 20),
    end_time_label = left(nullif(trim(_end), ''), 20),
    child_name = left(nullif(trim(_child), ''), 80),
    nanny_id = _nanny,
    notes = left(nullif(trim(_notes), ''), 1000)
   where family_id = e.family_id
     and (id = _id or (_after and e.series_id is not null and series_id = e.series_id and entry_date >= e.entry_date
          and (is_household_owner(e.family_id) or created_by = auth.uid())));
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.edit_planner_entry(uuid, boolean, text, text, text, text, uuid, text) from public, anon;
grant execute on function public.edit_planner_entry(uuid, boolean, text, text, text, text, uuid, text) to authenticated, service_role;
