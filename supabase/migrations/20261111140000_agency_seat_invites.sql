-- Agencies fund household seats and invite families by email. They never see the resulting wallet.
-- An invite is the whole link between an agency and a seat: it holds only the email the agency typed.
create table if not exists public.agency_invites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.partner_agencies(id) on delete cascade,
  slot integer not null check (slot > 0),
  email text not null,
  -- sha256 of the emailed token; cleared once the invite is used. The raw token is never stored.
  token_hash text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'released')),
  invited_at timestamptz not null default now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  released_at timestamptz,
  family_id uuid references public.families(id) on delete set null
);

-- One open invite or household per slot; a revoked, expired or released slot is free again.
create unique index if not exists agency_invites_open_slot on public.agency_invites (agency_id, slot) where status in ('pending', 'accepted');
create unique index if not exists agency_invites_pending_email on public.agency_invites (agency_id, lower(email)) where status = 'pending';
create unique index if not exists agency_invites_token on public.agency_invites (token_hash) where token_hash is not null;
create index if not exists agency_invites_family on public.agency_invites (family_id);

-- Service role only: RLS on with no policies.
alter table public.agency_invites enable row level security;

-- Set when an agency releases a seat. The wallet and its data are kept.
alter table public.families add column if not exists agency_released_at timestamptz;

-- Existing agency-run families keep their seats: give each one a slot and an accepted invite.
insert into public.agency_invites (agency_id, slot, email, status, accepted_at, family_id)
select
  f.partner_agency_id,
  row_number() over (partition by f.partner_agency_id order by f.created_at, f.id),
  coalesce(nullif(lower(trim(f.contact_email)), ''), 'household-' || substr(f.id::text, 1, 8) || '@no-email.invalid'),
  'accepted',
  f.created_at,
  f.id
from public.families f
where f.partner_agency_id is not null
  and f.status = 'active'
  and f.agency_released_at is null
  and not exists (select 1 from public.agency_invites i where i.family_id = f.id);
