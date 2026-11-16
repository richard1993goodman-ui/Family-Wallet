-- V2 (decided 16 Nov): a quick-log entry can be kept off the day's timeline and still go to the daily report that the
-- AI recap summarises. Existing rows stay on the timeline. Nothing is removed or changed.
alter table public.care_events add column if not exists show_on_timeline boolean not null default true;
alter table public.daily_logs add column if not exists show_on_timeline boolean not null default true;
