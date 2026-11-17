-- V2 (16 Nov, agreed): the weekly report is ready to review at the end of the working week. Every Friday at 18:00 in the
-- household's own time zone, the parents are sent one generic banner ("Weekly report is ready to review"). The report
-- itself is the screen More > Weekly report, read live; this table only records that it was announced and reviewed.
-- The schedule needs the pg_cron extension (the database's scheduler), switched on for the test copy first.

create extension if not exists pg_cron;

create table if not exists public.weekly_report_ready (
  family_id uuid not null references public.families(id) on delete cascade,
  week_start date not null,
  ready_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text check (reviewed_by in ('family', 'nanny')),
  primary key (family_id, week_start)
);
alter table public.weekly_report_ready enable row level security;
revoke all on public.weekly_report_ready from anon, authenticated;
grant select on public.weekly_report_ready to authenticated;
create policy "Members read report status" on public.weekly_report_ready for select to authenticated
  using (public.is_household_member(family_id));

-- Announces the report for every household whose local time is Friday 18:00. Runs hourly; a household is announced
-- once per week, so the hour it lands on (summer or winter time) does not matter.
create or replace function public.announce_weekly_reports() returns integer
language plpgsql security definer set search_path = public as $$
declare f record; now_local timestamp; week date; n int := 0;
begin
  for f in select id, coalesce(time_zone, 'Europe/London') as tz from families where status = 'active' loop
    now_local := now() at time zone f.tz;
    if extract(dow from now_local) = 5 and extract(hour from now_local) = 18 then
      week := now_local::date - 4; -- the Monday of this week
      insert into weekly_report_ready (family_id, week_start) values (f.id, week) on conflict do nothing;
      if found then
        -- Sent by the nanny's side, so the parents are the ones who get it (push_to_app never sends to the actor's side).
        perform push_to_app(f.id, 'nanny', 'reports', 'Weekly report is ready to review');
        n := n + 1;
      end if;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.announce_weekly_reports() from public, anon, authenticated;

-- A parent marks the week reviewed. Staff cannot (the report holds pay and the whole household's records).
create or replace function public.mark_weekly_report_reviewed(_family uuid, _week date) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_household_owner(_family) then raise exception 'Only parents can mark the report reviewed'; end if;
  update weekly_report_ready set reviewed_at = now(), reviewed_by = 'family'
    where family_id = _family and week_start = _week and reviewed_at is null;
  return found;
end $$;
revoke execute on function public.mark_weekly_report_reviewed(uuid, date) from public, anon;
grant execute on function public.mark_weekly_report_reviewed(uuid, date) to authenticated, service_role;

-- Hourly, every Friday hour (the function picks the one that is 18:00 for each household).
select cron.schedule('weekly-report-ready', '0 * * * 5', 'select public.announce_weekly_reports()');
