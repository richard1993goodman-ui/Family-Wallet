-- A parent or the nanny can love a moment in the feed. One love per person per moment.
-- Service role only: RLS on with no policies.
create table if not exists public.moment_reactions (
  moment_id uuid not null references public.family_moments(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  by_role text not null check (by_role in ('family', 'nanny')),
  created_at timestamptz not null default now(),
  primary key (moment_id, by_role)
);
alter table public.moment_reactions enable row level security;
