-- A shift in progress: the nanny taps start and end, and the hours become a timesheet line for the parent to approve.
-- Service role only: RLS on with no policies.
create table if not exists public.shift_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  nanny_id uuid references public.family_nannies(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  break_minutes integer not null default 0 check (break_minutes between 0 and 720),
  timesheet_shift_id uuid
);
create index if not exists shift_sessions_family_idx on public.shift_sessions (family_id, started_at desc);
-- One shift at a time per person.
create unique index if not exists shift_sessions_one_open on public.shift_sessions (nanny_id) where ended_at is null;
alter table public.shift_sessions enable row level security;
