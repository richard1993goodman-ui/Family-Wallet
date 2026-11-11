-- One-time agency invitations (Stage D1): a short backup code beside the link, both stored only as hashes.
alter table public.agency_invites
  add column if not exists code_hash text,
  add column if not exists code_attempts integer not null default 0,
  add column if not exists created_by uuid;
create unique index if not exists agency_invites_code on public.agency_invites (code_hash) where code_hash is not null;
