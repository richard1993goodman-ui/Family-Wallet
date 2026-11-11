-- Optional accounts (Stage C1). Additive only: nothing here changes how anyone signs in today.
-- A person is one human with a Supabase login. A household member is that person's relationship with one household.

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text not null,
  preferred_language text not null default 'en',
  time_zone text not null default 'Europe/London',
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  -- Null until the person claims an account from inside their existing wallet.
  person_id uuid references public.people(id) on delete restrict,
  role text not null check (role in ('owner', 'co_parent', 'staff')),
  nanny_id uuid unique references public.family_nannies(id) on delete set null,
  status text not null default 'active' check (status in ('invited', 'active', 'revoked', 'ended')),
  permissions jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  revoked_by uuid references public.people(id),
  unique (family_id, person_id)
);
create index if not exists household_members_person on public.household_members (person_id) where person_id is not null;
create index if not exists household_members_family on public.household_members (family_id);

-- One-time claim tokens: hashed, single use, short expiry. Service role only.
create table if not exists public.account_claims (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.household_members(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;
alter table public.household_members enable row level security;
alter table public.account_claims enable row level security;

-- A signed-in person can read only their own identity and their own memberships. Writes go through the server.
drop policy if exists "People read their own row" on public.people;
create policy "People read their own row" on public.people for select to authenticated using (user_id = auth.uid());
drop policy if exists "People read their own memberships" on public.household_members;
create policy "People read their own memberships" on public.household_members for select to authenticated
  using (person_id in (select id from public.people where user_id = auth.uid()));
grant select on public.people, public.household_members to authenticated;

-- Give every existing parent and staff member a place to attach an account later. Nobody's access changes.
insert into public.household_members (family_id, role, status)
select f.id, 'owner', 'active'
from public.families f
where not exists (select 1 from public.household_members m where m.family_id = f.id and m.role = 'owner');

insert into public.household_members (family_id, role, nanny_id, status, started_at)
select n.family_id, 'staff', n.id, case when n.status = 'active' then 'active' else 'ended' end, n.created_at
from public.family_nannies n
on conflict (nanny_id) do nothing;
