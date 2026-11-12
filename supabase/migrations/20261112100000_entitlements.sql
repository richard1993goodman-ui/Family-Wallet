-- Who is entitled to use Family Wallet, and why. One row per purchase or sponsorship; every change is also
-- kept as an event so the history can be read back. Service role only: RLS on with no policies.
-- The first source is Apple in-app purchase, reported by RevenueCat. Other sources fit the same table later.
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete restrict,
  -- The wallet this pays for; null until the family has created one.
  family_id uuid references public.families(id) on delete set null,
  source text not null check (source in ('apple_iap', 'google_iap', 'direct_stripe', 'agency_sponsored', 'athletemannies_membership')),
  state text not null check (state in ('trial', 'active', 'grace', 'expired')),
  product text,
  -- The store's own id for the subscription (Apple's original transaction id).
  external_ref text,
  environment text not null default 'production' check (environment in ('production', 'sandbox')),
  current_period_end timestamptz,
  will_renew boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_ref)
);
create index if not exists entitlements_person on public.entitlements (person_id);
create index if not exists entitlements_family on public.entitlements (family_id) where family_id is not null;

create table if not exists public.entitlement_events (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.entitlements(id) on delete cascade,
  at timestamptz not null default now(),
  event_type text not null,
  -- The provider's event id, so a retried delivery is recognised and ignored.
  provider_event_id text unique,
  -- Facts only (type, product, dates). Never receipts or personal details.
  detail jsonb not null default '{}'::jsonb
);
create index if not exists entitlement_events_entitlement_at on public.entitlement_events (entitlement_id, at desc);

alter table public.entitlements enable row level security;
alter table public.entitlement_events enable row level security;
revoke update, delete, truncate on public.entitlement_events from anon, authenticated, service_role;
