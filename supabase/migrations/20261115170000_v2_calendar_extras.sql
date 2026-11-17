-- V2 Calendar extras (plan 5h, agreed 14 Nov): leave and live-in from the app.
-- The website does these on its server with the master key; the app needs small functions so the same rules hold.
-- Additive only: four new functions, no table or policy changes.

-- Add leave. A parent's booking is approved at once and goes on the calendar (as the website does);
-- staff can only ask for their own leave, which waits for a parent.
-- _days is worked out by the app with the website's counting code (agreed 14 Nov: a parent checks it before approving).
create or replace function public.add_leave(_family uuid, _nanny uuid, _type text, _start date, _end date, _days numeric, _notes text default null)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare parent boolean; new_id uuid; who text;
begin
  parent := is_household_owner(_family);
  if not parent and my_staff_nanny(_family) is distinct from _nanny then raise exception 'You can only ask for your own leave'; end if;
  select name into who from family_nannies where id = _nanny and family_id = _family;
  if not found then raise exception 'That person is not in this household'; end if;
  if _type not in ('holiday', 'sick', 'unpaid', 'other') then raise exception 'Choose a type of leave'; end if;
  if _start is null or _end is null or _end < _start or _end - _start > 366 then raise exception 'Check the dates'; end if;
  if _days is null or _days <= 0 or _days > 366 then raise exception 'Those dates do not include any agreed working days'; end if;
  insert into leave_requests (family_id, nanny_id, leave_type, start_date, end_date, days, notes, requested_by, status, reviewed_at)
    values (_family, _nanny, _type, _start, _end, _days, nullif(left(btrim(coalesce(_notes, '')), 1000), ''),
      case when parent then 'family' else 'nanny' end, case when parent then 'approved' else 'pending' end,
      case when parent then now() end)
    returning id into new_id;
  if parent then
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by, notes)
      values (_family, _start, coalesce(who, 'Nanny') || case when _type = 'sick' then ' on sick leave' else ' on leave' end, 'leave', 'family',
        to_char(_days, 'FM999990.##') || case when _days = 1 then ' day' else ' days' end || ' to ' || _end);
  end if;
  return new_id;
end $$;

-- A parent approves or declines a waiting request; an approved one goes on the calendar.
create or replace function public.review_leave(_id uuid, _status text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare r leave_requests; who text;
begin
  if _status not in ('approved', 'declined') then raise exception 'Choose approve or decline'; end if;
  select * into r from leave_requests where id = _id;
  if not found or not is_household_owner(r.family_id) then raise exception 'Only a parent can answer a leave request'; end if;
  if r.status <> 'pending' then raise exception 'That request has already been answered'; end if;
  update leave_requests set status = _status, reviewed_at = now(), updated_at = now() where id = _id;
  if _status = 'approved' then
    select name into who from family_nannies where id = r.nanny_id;
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by, notes)
      values (r.family_id, r.start_date, coalesce(who, 'Nanny') || case when r.leave_type = 'sick' then ' on sick leave' else ' on leave' end, 'leave', 'family',
        to_char(r.days, 'FM999990.##') || case when r.days = 1 then ' day' else ' days' end || ' to ' || r.end_date);
  end if;
end $$;

-- Remove leave: a parent any; staff only their own request while it is still waiting.
create or replace function public.remove_leave(_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare r leave_requests;
begin
  select * into r from leave_requests where id = _id;
  if not found or not (is_household_owner(r.family_id)
    or (r.status = 'pending' and r.nanny_id = my_staff_nanny(r.family_id))) then
    raise exception 'You cannot remove that leave';
  end if;
  delete from leave_requests where id = _id;
end $$;

-- Log a live-in week (parent or staff, as on the website). The same week again replaces the hours; "paid" is kept.
create or replace function public.log_live_in_week(_family uuid, _week date, _hours numeric, _days_off int, _note text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not is_household_member(_family) then raise exception 'Not your household'; end if;
  if _week is null then raise exception 'Choose a week'; end if;
  if _hours is null or _hours < 0 or _hours > 100 then raise exception 'Hours must be between 0 and 100'; end if;
  if _days_off is null or _days_off < 0 or _days_off > 7 then raise exception 'Days off must be between 0 and 7'; end if;
  insert into live_in_weeks (family_id, week_start, hours_worked, days_off, note)
    values (_family, _week - (extract(isodow from _week)::int - 1), round(_hours, 2), _days_off, nullif(left(btrim(coalesce(_note, '')), 2000), ''))
    on conflict (family_id, week_start) do update set hours_worked = excluded.hours_worked, days_off = excluded.days_off, note = excluded.note;
end $$;

revoke execute on function public.add_leave(uuid, uuid, text, date, date, numeric, text) from public, anon;
revoke execute on function public.review_leave(uuid, text) from public, anon;
revoke execute on function public.remove_leave(uuid) from public, anon;
revoke execute on function public.log_live_in_week(uuid, date, numeric, int, text) from public, anon;
grant execute on function public.add_leave(uuid, uuid, text, date, date, numeric, text) to authenticated, service_role;
grant execute on function public.review_leave(uuid, text) to authenticated, service_role;
grant execute on function public.remove_leave(uuid) to authenticated, service_role;
grant execute on function public.log_live_in_week(uuid, date, numeric, int, text) to authenticated, service_role;
