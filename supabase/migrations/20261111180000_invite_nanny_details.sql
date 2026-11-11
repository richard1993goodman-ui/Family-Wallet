-- An agency can include the nanny when it invites a family. The nanny's sign-in link and code are made
-- when the family activates and go to the nanny by email only; the agency never sees them.
alter table public.agency_invites
  add column if not exists nanny_name text,
  add column if not exists nanny_email text;
