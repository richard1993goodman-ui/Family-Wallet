-- Who is paying for a household. Null means unmanaged (direct families, the owner's own families),
-- and those are never touched by transitions or suspension.
--   agency_active : an agency funds a seat
--   transition    : the agency released the seat; the family has until transition_ends_at to subscribe directly
--   direct_active : the family pays for itself
--   suspended     : no entitlement; the wallet is blocked and the data is kept (status = 'suspended')
alter table public.families
  add column if not exists entitlement text check (entitlement in ('agency_active', 'transition', 'direct_active', 'suspended')),
  add column if not exists transition_ends_at timestamptz;

-- Households an agency funds today. Everyone else stays null and therefore unaffected.
update public.families
set entitlement = 'agency_active'
where partner_agency_id is not null and agency_released_at is null and status = 'active' and entitlement is null;
