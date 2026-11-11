-- Term-time / full-time arrangement, repeat-weekly choice and holiday date ranges for each person's working hours.
alter table public.nanny_work_hours
  add column if not exists schedule jsonb not null default '{}'::jsonb;
