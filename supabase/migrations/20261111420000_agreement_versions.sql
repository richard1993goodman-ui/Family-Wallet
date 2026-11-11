-- Stage E1: every issued version of an agreement is kept for ever, exactly as it was issued.
-- Before this, editing and re-issuing an agreement overwrote the wording that earlier signatures referred to.
create table if not exists public.agreement_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.nanny_agreements(id) on delete restrict,
  family_id uuid not null references public.families(id) on delete cascade,
  nanny_id uuid references public.family_nannies(id) on delete set null,
  version integer not null,
  -- The agreement exactly as issued, and a SHA-256 of that text, so any later change is detectable.
  snapshot_text text not null,
  content_hash text not null,
  issued_at timestamptz not null default now(),
  unique (agreement_id, version)
);
create index if not exists agreement_versions_family on public.agreement_versions (family_id);
alter table public.agreement_versions enable row level security;
-- Append-only: nobody, including the server's own key, can change or remove history.
revoke update, delete, truncate on public.agreement_versions from anon, authenticated, service_role;

-- Each signature records which version it covers and the hash of that wording.
alter table public.document_signatures
  add column if not exists agreement_version_id uuid references public.agreement_versions(id) on delete restrict,
  add column if not exists content_hash text;

-- Keep what exists: the latest issued wording of every issued agreement becomes its version record.
-- Earlier wording that was already overwritten before today cannot be recovered.
insert into public.agreement_versions (agreement_id, family_id, nanny_id, version, snapshot_text, content_hash, issued_at)
select a.id, a.family_id, a.nanny_id, a.version, a.agreement_data::text,
       encode(sha256(convert_to(a.agreement_data::text, 'UTF8')), 'hex'), coalesce(a.issued_at, a.updated_at)
from public.nanny_agreements a
where a.status = 'issued' and a.agreement_data is not null
on conflict (agreement_id, version) do nothing;

-- Signatures that were given on exactly that version now point at it.
update public.document_signatures s
set agreement_version_id = v.id, content_hash = v.content_hash
from public.agreement_versions v
join public.nanny_agreements a on a.id = v.agreement_id
where s.doc_kind = 'agreement' and s.family_id = v.family_id and s.nanny_id is not distinct from v.nanny_id
  and s.doc_version = v.version::text and s.agreement_version_id is null;
