-- Access codes are shown once and stored only as hashes. The readable copy is kept just until the owner of the
-- code first signs in with it, then cleared, so a database leak or backup never exposes working codes.
alter table public.families alter column access_code drop not null;
