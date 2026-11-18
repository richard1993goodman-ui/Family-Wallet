-- Family Wallet V2: mileage (18 Nov). A member of staff logs a journey made in their own car; a parent approves or
-- declines it. Only approved mileage is counted in the payroll export. Nothing here works out a rate or a payment.
-- The same rules as expense claims: a household's parents see every journey, a staff member sees their own, staff can
-- add a journey for themselves (pending only), and only a parent can review one (through review_mileage).

create table if not exists public.mileage_claims (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  nanny_id uuid not null,
  trip_date date not null default current_date,
  miles numeric(7,1) not null check (miles > 0 and miles <= 2000),
  purpose text not null check (char_length(purpose) between 1 and 200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  submitted_by text not null check (submitted_by in ('family', 'nanny')),
  submitted_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mileage_claims_family_date on public.mileage_claims (family_id, trip_date);
create index if not exists mileage_claims_nanny on public.mileage_claims (nanny_id);

alter table public.mileage_claims enable row level security;

create policy "Parents or own read" on public.mileage_claims for select to authenticated
  using (is_household_owner(family_id) or nanny_id = my_staff_nanny(family_id));

create policy "Parents add" on public.mileage_claims for insert to authenticated
  with check (is_household_owner(family_id) and submitted_by = 'family' and status = 'pending');

create policy "Staff submit own" on public.mileage_claims for insert to authenticated
  with check (nanny_id = my_staff_nanny(family_id) and submitted_by = 'nanny' and status = 'pending');

-- No update or delete policy: a journey's status changes only through review_mileage.
revoke all on public.mileage_claims from anon;
grant select, insert on public.mileage_claims to authenticated;
grant select, insert, update, delete on public.mileage_claims to service_role;

-- A parent approves or declines a journey, and nothing else on it changes.
create or replace function public.review_mileage(_id uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
declare fam uuid;
begin
  if _status not in ('approved', 'declined') then raise exception 'A journey can only be approved or declined'; end if;
  select family_id into fam from mileage_claims where id = _id;
  if fam is null or not is_household_owner(fam) then raise exception 'Only a parent of this household can review this journey'; end if;
  update mileage_claims set status = _status, reviewed_at = now(), updated_at = now() where id = _id;
end $$;

revoke execute on function public.review_mileage(uuid, text) from public, anon;
grant execute on function public.review_mileage(uuid, text) to authenticated, service_role;
