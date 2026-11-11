-- Stage E5 option A: each agreement signature can be tied to an email address the signer proved they control, with a
-- one-time code. Codes are stored only as hashes and expire quickly. Nothing changes for anyone until the
-- SIGNING_VERIFICATION switch is turned on.

create table if not exists public.signing_codes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  signer_role text not null check (signer_role in ('parent', 'nanny')),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists signing_codes_lookup on public.signing_codes (family_id, signer_role, email, created_at desc);
-- Service role only: RLS on with no policies.
alter table public.signing_codes enable row level security;

alter table public.document_signatures
  add column if not exists verified_email text,
  add column if not exists verified_at timestamptz;
