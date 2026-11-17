-- V2 Phase 7 onboarding step 9 (nanny or staff, optional): the family's owner adds a staff member. The staff table has
-- no rule that lets the app insert directly, so this checks the owner and the basics itself.

create or replace function public.add_family_staff(_family uuid, _name text, _role text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  _clean text := trim(coalesce(_name, ''));
  _id uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not is_household_owner(_family) then raise exception 'Only a parent can add staff.'; end if;
  if char_length(_clean) < 2 or char_length(_clean) > 80 then raise exception 'Enter the staff member''s name (2 to 80 characters).'; end if;
  if _role not in ('nanny', 'au_pair', 'maternity_nurse', 'housekeeper', 'cook', 'driver', 'personal_assistant', 'tutor', 'other') then
    raise exception 'Choose a role.';
  end if;
  insert into family_nannies (family_id, name, role, status, sort_order)
    values (_family, _clean, _role, 'active', coalesce((select max(sort_order) + 1 from family_nannies where family_id = _family), 0))
    returning id into _id;
  insert into audit_log (actor_kind, actor_id, action, family_id)
    values ('parent', (select id::text from people where user_id = auth.uid()), 'staff_added', _family);
  return _id;
end;
$$;

revoke execute on function public.add_family_staff(uuid, text, text) from public, anon;
grant execute on function public.add_family_staff(uuid, text, text) to authenticated, service_role;
