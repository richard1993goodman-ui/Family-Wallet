-- Short-lived one-time PINs that let a signed-in family add another device without sharing the permanent access code.
create table if not exists public.wallet_pair_pins (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  pin_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists wallet_pair_pins_slug_idx on public.wallet_pair_pins (slug);
-- Service role only: RLS on with no policies, so the browser can never read or write PINs.
alter table public.wallet_pair_pins enable row level security;
