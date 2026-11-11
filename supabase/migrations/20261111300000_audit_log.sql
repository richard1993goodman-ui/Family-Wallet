-- Append-only record of who did what to sensitive data. Written by server code with the service key only.
-- Service role only: RLS on with no policies, and update/delete are revoked so history cannot be rewritten.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_kind text not null check (actor_kind in ('owner', 'agency_staff', 'parent', 'nanny', 'system', 'webhook')),
  actor_id text,
  action text not null,
  family_id uuid,
  agency_id uuid,
  -- Why it happened, never the sensitive data itself (no codes, no document contents).
  reason text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_family_at on public.audit_log (family_id, at desc);
create index if not exists audit_log_agency_at on public.audit_log (agency_id, at desc);

alter table public.audit_log enable row level security;
revoke update, delete, truncate on public.audit_log from anon, authenticated, service_role;
