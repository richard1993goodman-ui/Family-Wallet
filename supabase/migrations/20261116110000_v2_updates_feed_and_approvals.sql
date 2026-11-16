-- V2 (16 Nov, agreed): every change made in the app is written to the updates feed (the bell), and the other side
-- gets a phone banner only for what needs them: a shift change waiting for approval. The three agreed kinds (messages,
-- photos, highlights) still push as before. Lock-screen text stays generic: no names, no content.

-- Two more push kinds the phone can switch off: approvals (shift changes) and reports (the weekly report).
alter table public.app_push_tokens drop constraint if exists app_push_tokens_muted_check;
alter table public.app_push_tokens add constraint app_push_tokens_muted_check
  check (muted <@ array['messages', 'moments', 'highlights', 'approvals', 'reports']::text[]);

-- A shift change waiting for approval pushes to the other side only (push_to_app skips the side that made it).
create or replace function public.on_shift_change_pending() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.entry_type = 'shift_change' and new.approval = 'pending' and new.status is distinct from 'cancelled' then
    perform public.push_to_app(new.family_id, new.added_by, 'approvals', 'A shift change is waiting for approval');
  end if;
  return new;
end $$;
drop trigger if exists shift_change_pending on public.planner_entries;
create trigger shift_change_pending after insert on public.planner_entries
  for each row execute function public.on_shift_change_pending();
revoke execute on function public.on_shift_change_pending() from public, anon, authenticated;

-- Every change to a household record goes into the updates feed. Written by the database, so nothing the app forgets
-- to log is missed. The feed is in-app only (never pushed), so names may appear in it. A failure never stops the change.
create or replace function public.write_update_feed() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  fam uuid := (r->>'family_id')::uuid;
  feat text;
  detail text;
  verb text := case tg_op when 'INSERT' then 'added' when 'UPDATE' then 'changed' else 'removed' end;
  who text;
begin
  begin
    feat := case tg_table_name
      when 'planner_entries' then 'Calendar' when 'care_events' then 'Home log' when 'daily_logs' then 'Daily log'
      when 'medication_doses' then 'Medicine' when 'incident_reports' then 'Incidents' when 'family_moments' then 'Photos'
      when 'grocery_items' then 'Groceries' when 'wallet_documents' then 'Documents' when 'timesheet_shifts' then 'Timesheets'
      when 'house_manual_entries' then 'House manual' else tg_table_name end;
    detail := case tg_table_name
      when 'planner_entries' then r->>'title' when 'care_events' then coalesce(r->>'detail', r->>'kind')
      when 'grocery_items' then r->>'name' when 'wallet_documents' then r->>'title' when 'house_manual_entries' then r->>'title'
      when 'timesheet_shifts' then r->>'shift_date' when 'medication_doses' then 'a dose'
      when 'family_moments' then 'a photo' when 'daily_logs' then 'a diary entry' when 'incident_reports' then 'a report'
      else null end;
    who := coalesce(public.household_side(fam), 'system');
    if fam is not null then
      insert into wallet_activity (family_id, feature, actor, summary)
        values (fam, feat, who, left(concat_ws(' ', feat || ':', coalesce(detail, 'item'), verb), 300));
    end if;
  exception when others then
    raise warning 'write_update_feed failed: %', sqlerrm;
  end;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke execute on function public.write_update_feed() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['planner_entries', 'care_events', 'daily_logs', 'medication_doses', 'incident_reports', 'family_moments',
    'grocery_items', 'wallet_documents', 'timesheet_shifts', 'house_manual_entries'] loop
    execute format('drop trigger if exists write_update_feed on public.%I', t);
    execute format('create trigger write_update_feed after insert or update or delete on public.%I for each row execute function public.write_update_feed()', t);
  end loop;
end $$;
