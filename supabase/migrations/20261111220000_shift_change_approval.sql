-- A changed or cancelled shift only counts once the other person approves it. Everything that exists today stays approved.
alter table public.planner_entries
  add column if not exists approval text not null default 'approved' check (approval in ('pending', 'approved', 'declined'));
