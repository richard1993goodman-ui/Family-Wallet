-- V2 Phase 5 step 2: a parent approves or declines a shift from the app (agreed 14 Nov).
-- Same as V1's reviewShift: only a parent of that household, only those two outcomes, re-reviewing allowed.
-- A function rather than an update rule, so a parent can change the status and nothing else on the shift.

create or replace function public.review_shift(_id uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
declare fam uuid;
begin
  if _status not in ('approved', 'declined') then raise exception 'A shift can only be approved or declined'; end if;
  select family_id into fam from timesheet_shifts where id = _id;
  if fam is null or not is_household_owner(fam) then raise exception 'Only a parent of this household can review this shift'; end if;
  update timesheet_shifts set status = _status, reviewed_at = now(), updated_at = now() where id = _id;
end $$;

revoke execute on function public.review_shift(uuid, text) from public, anon;
grant execute on function public.review_shift(uuid, text) to authenticated, service_role;
