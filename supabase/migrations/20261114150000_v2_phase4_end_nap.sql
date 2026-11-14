-- V2 Phase 4: anyone in the household can end a running nap, as on the website (agreed 14 Nov).
-- The care log rules otherwise let only the author or a parent change an entry, so this one narrow
-- function sets the wake-up time on an open nap and nothing else. Returns false if nothing was ended.
create or replace function public.end_nap(_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update care_events set ended_at = now()
   where id = _id and kind = 'nap' and ended_at is null and is_household_member(family_id);
  return found;
end $$;

revoke execute on function public.end_nap(uuid) from public, anon;
grant execute on function public.end_nap(uuid) to authenticated, service_role;
