-- V2 Phase 4 calendar (agreed 14 Nov): staff remove the calendar items they added themselves,
-- and whoever did not make a shift change approves or declines it, as on the website.

-- Who wrote each item. Website rows stay null, so only parents can remove those.
alter table public.planner_entries add column if not exists created_by uuid default auth.uid();

drop policy if exists "Staff add" on public.planner_entries;
create policy "Staff add" on public.planner_entries for insert to authenticated
  with check (public.my_staff_nanny(family_id) is not null and added_by = 'nanny' and created_by = auth.uid()
    and (entry_type <> 'shift_change' or approval = 'pending'));

create policy "Staff remove own" on public.planner_entries for delete to authenticated
  using (public.my_staff_nanny(family_id) is not null and created_by = auth.uid());

-- Sets only the decision on a pending shift change, and only for the other side of the household.
create or replace function public.review_shift_change(_id uuid, _decision text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if _decision not in ('approved', 'declined') then return false; end if;
  update planner_entries set approval = _decision
   where id = _id and entry_type = 'shift_change' and approval = 'pending'
     and household_side(family_id) is not null and added_by is distinct from household_side(family_id);
  return found;
end $$;

revoke execute on function public.review_shift_change(uuid, text) from public, anon;
grant execute on function public.review_shift_change(uuid, text) to authenticated, service_role;
