-- V2 Phase 4: one shared quick log layout per household (agreed 14 Nov): anyone in the household may show, hide
-- or reorder the existing buttons; no custom buttons. Empty (null) means "suggested by the children's ages".
-- The website ignores the new column.
alter table public.families add column if not exists quick_actions text[];

create or replace view public.household_basics with (security_barrier) as
  select id, family_name, country, region, time_zone, currency, status, quick_actions
  from public.families where public.is_household_member(id);

-- Only known buttons, each at most once; null goes back to the suggested layout.
create or replace function public.set_quick_actions(_family uuid, _actions text[])
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if _actions is not null and (
    array_position(_actions, null) is not null
    or exists (select 1 from unnest(_actions) a where a not in ('note', 'med', 'meal', 'activity', 'nap', 'potty', 'wet', 'dirty', 'bottle'))
    or cardinality(_actions) <> (select count(distinct a) from unnest(_actions) a)
  ) then return false; end if;
  update families set quick_actions = _actions where id = _family and household_side(_family) is not null;
  return found;
end $$;

revoke execute on function public.set_quick_actions(uuid, text[]) from public, anon;
grant execute on function public.set_quick_actions(uuid, text[]) to authenticated, service_role;
