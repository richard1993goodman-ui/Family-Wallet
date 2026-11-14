-- V2 access rules, groups 1 (household information) and 2 (day-to-day care).
-- Agreed 14 Nov 2026: family-wallet-v2-access-rules.md. Test copy first; live only with approval.
-- Additive only: V1 uses the service key, which ignores these rules, so the website is unaffected.

-- Which side of the household the signed-in person is on: 'family' (owner/co-parent), 'nanny' (staff) or null.
create or replace function public.household_side(_family uuid)
returns text language sql stable security definer set search_path to 'public' as $$
  select case when public.is_household_owner(_family) then 'family'
              when public.my_staff_nanny(_family) is not null then 'nanny' end
$$;

-- Who wrote each entry, so staff can correct their own. V1 rows stay null (only parents can correct those).
alter table public.care_events add column if not exists created_by uuid default auth.uid();
alter table public.daily_logs add column if not exists created_by uuid default auth.uid();
alter table public.handover_checklists add column if not exists created_by uuid default auth.uid();
alter table public.kids_playbook_entries add column if not exists created_by uuid default auth.uid();
alter table public.medication_doses add column if not exists created_by uuid default auth.uid();
alter table public.family_moments add column if not exists created_by uuid default auth.uid();
alter table public.sports_passport_entries add column if not exists created_by uuid default auth.uid();
alter table public.incident_reports add column if not exists created_by uuid default auth.uid();

-- Everyone in the household can read these.
do $$ declare t text; begin
  foreach t in array array['family_profile', 'family_children', 'family_contacts', 'household_permissions',
    'kids_playbook_entries', 'live_in_settings', 'travel_trips', 'welcome_progress', 'welcome_checkins',
    'care_events', 'daily_logs', 'handover_checklists', 'medication_doses', 'family_moments', 'moment_reactions',
    'sports_passport_entries', 'planner_entries'] loop
    execute format('create policy "Members read" on public.%I for select to authenticated using (public.is_household_member(family_id))', t);
  end loop;
end $$;

-- Parents add, change and remove these.
do $$ declare t text; begin
  foreach t in array array['family_profile', 'family_children', 'family_contacts', 'household_permissions',
    'live_in_settings', 'travel_trips', 'planner_entries'] loop
    execute format('create policy "Parents add" on public.%I for insert to authenticated with check (public.is_household_owner(family_id))', t);
    execute format('create policy "Parents change" on public.%I for update to authenticated using (public.is_household_owner(family_id)) with check (public.is_household_owner(family_id))', t);
    execute format('create policy "Parents remove" on public.%I for delete to authenticated using (public.is_household_owner(family_id))', t);
  end loop;
end $$;

-- Anyone in the household adds entries as themselves; the "who" column must match their side.
do $$ declare r record; begin
  for r in select * from (values ('care_events', 'added_by'), ('kids_playbook_entries', 'added_by'),
    ('family_moments', 'added_by'), ('sports_passport_entries', 'logged_by'), ('medication_doses', 'given_by'),
    ('incident_reports', 'reported_by'), ('handover_checklists', 'submitted_by'), ('daily_logs', null)) v(t, side) loop
    execute format('create policy "Members add own" on public.%I for insert to authenticated with check (public.is_household_member(family_id) and created_by = auth.uid()%s)',
      r.t, case when r.side is null then '' else format(' and %I = public.household_side(family_id)', r.side) end);
  end loop;
end $$;

-- Staff correct their own entries; parents correct any. Medication is never changed or removed.
do $$ declare t text; begin
  foreach t in array array['care_events', 'daily_logs', 'handover_checklists', 'kids_playbook_entries'] loop
    execute format('create policy "Own or parent change" on public.%I for update to authenticated using (public.is_household_owner(family_id) or (public.is_household_member(family_id) and created_by = auth.uid())) with check (public.is_household_owner(family_id) or (public.is_household_member(family_id) and created_by = auth.uid()))', t);
  end loop;
  foreach t in array array['care_events', 'daily_logs', 'handover_checklists', 'kids_playbook_entries', 'family_moments'] loop
    execute format('create policy "Own or parent remove" on public.%I for delete to authenticated using (public.is_household_owner(family_id) or (public.is_household_member(family_id) and created_by = auth.uid()))', t);
  end loop;
end $$;

-- Reactions: one per side, on a photo in the same household.
create policy "Members react" on public.moment_reactions for insert to authenticated
  with check (by_role = public.household_side(family_id)
    and exists (select 1 from public.family_moments m where m.id = moment_id and m.family_id = moment_reactions.family_id));
create policy "Members unreact" on public.moment_reactions for delete to authenticated
  using (by_role = public.household_side(family_id));

-- Staff add calendar entries; a shift change always starts as pending (a parent approves via the server).
create policy "Staff add" on public.planner_entries for insert to authenticated
  with check (public.my_staff_nanny(family_id) is not null and added_by = 'nanny'
    and (entry_type <> 'shift_change' or approval = 'pending'));

-- House manual: parents manage it. Secret values (door codes, Wi-Fi) are never readable by the app;
-- they are shown one at a time through a server function, as in V1.
revoke select, insert, update on public.house_manual_entries from anon, authenticated;
grant select (id, family_id, category, title, notes, updated_at, has_secret) on public.house_manual_entries to authenticated;
grant insert (family_id, category, title, notes) on public.house_manual_entries to authenticated;
grant update (category, title, notes) on public.house_manual_entries to authenticated;
create policy "Parents add" on public.house_manual_entries for insert to authenticated with check (public.is_household_owner(family_id));
create policy "Parents change" on public.house_manual_entries for update to authenticated using (public.is_household_owner(family_id)) with check (public.is_household_owner(family_id));
create policy "Parents remove" on public.house_manual_entries for delete to authenticated using (public.is_household_owner(family_id));

-- Household basics: the safe part of the families row (never codes, fees or notes), for everyone in the household.
-- The families table itself stays closed to the app.
create view public.household_basics with (security_barrier) as
  select id, family_name, country, region, time_zone, currency, status
  from public.families where public.is_household_member(id);
revoke all on public.household_basics from anon, authenticated;
grant select on public.household_basics to authenticated;
