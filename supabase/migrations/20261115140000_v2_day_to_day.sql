-- V2 Day to day pages (agreed 14 Nov): incident sign-off and expense review from the app.
-- Medicine doses and incident reports are never removed or edited (access rules), so no delete rules here.

-- A staff member's report must wait for a parent to sign it off; only a parent's own report starts signed off.
drop policy if exists "Members add own" on public.incident_reports;
create policy "Members add own" on public.incident_reports for insert to authenticated
  with check (
    is_household_member(family_id) and created_by = auth.uid() and reported_by = household_side(family_id)
    and (reported_by = 'family' or (acknowledged_at is null and acknowledged_by_name is null))
  );

-- Same as V1's acknowledgeIncident: a parent of that household signs off a report, once.
create or replace function public.acknowledge_incident(_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare fam uuid;
begin
  select family_id into fam from incident_reports where id = _id;
  if fam is null or not is_household_owner(fam) then raise exception 'Only a parent of this household can sign off a report'; end if;
  update incident_reports
     set acknowledged_at = now(),
         acknowledged_by_name = coalesce((select display_name from people where user_id = auth.uid() limit 1), 'A parent')
   where id = _id and acknowledged_at is null;
  return found;
end $$;

-- Same as V1's reviewExpense: a parent marks a claim reimbursed or declined, and nothing else on it.
create or replace function public.review_expense(_id uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
declare fam uuid;
begin
  if _status not in ('reimbursed', 'declined') then raise exception 'An expense can only be reimbursed or declined'; end if;
  select family_id into fam from expense_claims where id = _id;
  if fam is null or not is_household_owner(fam) then raise exception 'Only a parent of this household can review this expense'; end if;
  update expense_claims set status = _status, reviewed_at = now(), updated_at = now() where id = _id;
end $$;

revoke execute on function public.acknowledge_incident(uuid) from public, anon;
revoke execute on function public.review_expense(uuid, text) from public, anon;
grant execute on function public.acknowledge_incident(uuid) to authenticated, service_role;
grant execute on function public.review_expense(uuid, text) to authenticated, service_role;
