-- Cross-tenant isolation test for the C5 read policies. Run it as a database admin.
-- It builds two synthetic households and several people, checks what each person can and cannot read through
-- the database API rules, and ALWAYS ends by raising an exception, so nothing it creates is ever kept.
-- Success looks like an error whose message starts with ISOLATION_TEST_PASSED.
do $$
declare
  uo_a uuid := gen_random_uuid(); uo_b uuid := gen_random_uuid(); u_pat uuid := gen_random_uuid();
  u_lee uuid := gen_random_uuid(); u_out uuid := gen_random_uuid();
  fam_a uuid := gen_random_uuid(); fam_b uuid := gen_random_uuid();
  nan_a1 uuid := gen_random_uuid(); nan_a2 uuid := gen_random_uuid(); nan_b1 uuid := gen_random_uuid();
  p_oa uuid := gen_random_uuid(); p_ob uuid := gen_random_uuid(); p_pat uuid := gen_random_uuid();
  p_lee uuid := gen_random_uuid(); p_out uuid := gen_random_uuid();
  n int; care_a uuid := gen_random_uuid(); med_a uuid := gen_random_uuid(); thr_a uuid := gen_random_uuid(); s text;
begin
  insert into auth.users (id, email, aud, role) values
    (uo_a, 'oa@test.invalid', 'authenticated', 'authenticated'), (uo_b, 'ob@test.invalid', 'authenticated', 'authenticated'),
    (u_pat, 'pat@test.invalid', 'authenticated', 'authenticated'), (u_lee, 'lee@test.invalid', 'authenticated', 'authenticated'),
    (u_out, 'out@test.invalid', 'authenticated', 'authenticated');
  insert into people (id, user_id, display_name) values
    (p_oa, uo_a, 'Owner A'), (p_ob, uo_b, 'Owner B'), (p_pat, u_pat, 'Pat'), (p_lee, u_lee, 'Lee'), (p_out, u_out, 'Outsider');
  insert into families (id, slug, family_name, access_code_hash) values
    (fam_a, 'test-a-' || substr(fam_a::text, 1, 6), 'Family A', 'x'), (fam_b, 'test-b-' || substr(fam_b::text, 1, 6), 'Family B', 'x');
  insert into family_nannies (id, family_id, name) values (nan_a1, fam_a, 'Pat in A'), (nan_a2, fam_a, 'Lee in A'), (nan_b1, fam_b, 'Pat in B');
  insert into household_members (family_id, person_id, role, nanny_id, status) values
    (fam_a, p_oa, 'owner', null, 'active'), (fam_b, p_ob, 'owner', null, 'active'),
    (fam_a, p_pat, 'staff', nan_a1, 'active'), (fam_b, p_pat, 'staff', nan_b1, 'active'),
    (fam_a, p_lee, 'staff', nan_a2, 'active');

  insert into wallet_documents (family_id, nanny_id, category, title, file_name, content_type, size_bytes, storage_path, shared_with_staff, uploaded_by) values
    (fam_a, null, 'id', 'A shared', 'a.pdf', 'application/pdf', 1, 'vault/' || fam_a || '/1', true, 'family'),
    (fam_a, null, 'id', 'A private', 'a.pdf', 'application/pdf', 1, 'vault/' || fam_a || '/2', false, 'family'),
    (fam_a, nan_a1, 'dbs', 'Pat DBS', 'a.pdf', 'application/pdf', 1, 'vault/' || fam_a || '/3', false, 'nanny'),
    (fam_a, nan_a2, 'dbs', 'Lee DBS', 'a.pdf', 'application/pdf', 1, 'vault/' || fam_a || '/4', false, 'nanny'),
    (fam_b, null, 'id', 'B private', 'b.pdf', 'application/pdf', 1, 'vault/' || fam_b || '/1', false, 'family');
  insert into nanny_bank_details (family_id, nanny_id, account_name, bank_name, sort_code, account_number) values
    (fam_a, nan_a1, 't', 't', '000000', '00000000'), (fam_a, nan_a2, 't', 't', '000000', '00000000'), (fam_b, nan_b1, 't', 't', '000000', '00000000');
  insert into house_manual_entries (family_id, category, title) values (fam_a, 'access', 'A door'), (fam_b, 'access', 'B door');
  insert into incident_reports (family_id, child_name, occurred_at, kind, severity, what_happened, reported_by) values
    (fam_a, 'c', now(), 'accident', 'minor', 'x', 'family'), (fam_b, 'c', now(), 'accident', 'minor', 'x', 'family');

  perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from wallet_documents; if n <> 4 then raise exception 'FAIL owner A documents: % (want 4)', n; end if;
  select count(*) into n from wallet_documents where family_id = fam_b; if n <> 0 then raise exception 'FAIL owner A sees family B documents'; end if;
  select count(*) into n from nanny_bank_details; if n <> 2 then raise exception 'FAIL owner A bank: %', n; end if;
  select count(*) into n from house_manual_entries; if n <> 1 then raise exception 'FAIL owner A house manual: %', n; end if;
  select count(*) into n from incident_reports; if n <> 1 then raise exception 'FAIL owner A incidents: %', n; end if;
  begin
    insert into wallet_documents (family_id, category, title, file_name, content_type, size_bytes, storage_path, uploaded_by)
      values (fam_a, 'id', 'x', 'x', 'x', 1, 'vault/x', 'family');
    raise exception 'FAIL owner A could write a document through the database API';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from wallet_documents; if n <> 1 then raise exception 'FAIL owner B documents: % (want 1)', n; end if;
  select count(*) into n from wallet_documents where family_id = fam_a; if n <> 0 then raise exception 'FAIL owner B sees family A documents'; end if;
  select count(*) into n from house_manual_entries where family_id = fam_a; if n <> 0 then raise exception 'FAIL owner B sees A house manual'; end if;
  reset role;

  -- Pat works for both families: only their own documents plus what A shared; both families' manual.
  perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from wallet_documents; if n <> 2 then raise exception 'FAIL Pat documents: % (want 2)', n; end if;
  select count(*) into n from wallet_documents where title in ('A private', 'Lee DBS', 'B private'); if n <> 0 then raise exception 'FAIL Pat sees documents that are not theirs'; end if;
  select count(*) into n from nanny_bank_details; if n <> 2 then raise exception 'FAIL Pat bank: % (want own A and own B)', n; end if;
  select count(*) into n from house_manual_entries; if n <> 2 then raise exception 'FAIL Pat house manual: %', n; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from wallet_documents; if n <> 2 then raise exception 'FAIL Lee documents: % (want 2)', n; end if;
  select count(*) into n from nanny_bank_details; if n <> 1 then raise exception 'FAIL Lee bank: % (want 1)', n; end if;
  select count(*) into n from house_manual_entries where family_id = fam_b; if n <> 0 then raise exception 'FAIL Lee sees family B'; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', u_out, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from wallet_documents; if n <> 0 then raise exception 'FAIL outsider documents: %', n; end if;
  select count(*) into n from nanny_bank_details; if n <> 0 then raise exception 'FAIL outsider bank: %', n; end if;
  select count(*) into n from house_manual_entries; if n <> 0 then raise exception 'FAIL outsider house manual: %', n; end if;
  select count(*) into n from incident_reports; if n <> 0 then raise exception 'FAIL outsider incidents: %', n; end if;
  reset role;

  -- Ending Pat's membership in A cuts them off from A immediately, and leaves B alone.
  update household_members set status = 'ended' where family_id = fam_a and person_id = p_pat;
  perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from house_manual_entries where family_id = fam_a; if n <> 0 then raise exception 'FAIL ended member still reads A house manual'; end if;
  select count(*) into n from wallet_documents where family_id = fam_a; if n <> 0 then raise exception 'FAIL ended member still reads A documents'; end if;
  select count(*) into n from house_manual_entries where family_id = fam_b; if n <> 1 then raise exception 'FAIL ending A also removed Pat from B'; end if;
  reset role;

  -- Not signed in: refused outright, not just shown nothing (Phase 1 lock-down).
  set local role anon;
  begin
    select count(*) into n from wallet_documents;
    raise exception 'FAIL anonymous visitors can reach documents (% rows)', n;
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.is_household_member(fam_a);
    raise exception 'FAIL anonymous visitors can run household checks';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- V2 groups 1 and 2: household information and day-to-day care (agreed 14 Nov).
  insert into family_children (family_id, name) values (fam_a, 'Child A'), (fam_b, 'Child B');
  insert into care_events (id, family_id, kind, added_by) values (care_a, fam_a, 'nap', 'family'); -- written the V1 way: no author
  insert into medication_doses (id, family_id, child_name, medicine) values (med_a, fam_a, 'Child A', 'Calpol');
  update house_manual_entries set secret_value = '1234' where family_id = fam_a;

  -- Lee, staff in A.
  perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from family_children; if n <> 1 then raise exception 'FAIL Lee children: % (want 1)', n; end if;
  select count(*) into n from household_basics; if n <> 1 then raise exception 'FAIL Lee household basics: % (want 1)', n; end if;
  insert into care_events (family_id, kind, added_by) values (fam_a, 'meal', 'nanny');
  update care_events set detail = 'x' where id = care_a; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL staff changed a parent''s care entry'; end if;
  update care_events set detail = 'x' where created_by = u_lee; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL staff could not correct their own care entry'; end if;
  begin
    insert into care_events (family_id, kind, added_by) values (fam_a, 'nap', 'family');
    raise exception 'FAIL staff added an entry posing as a parent';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin
    insert into care_events (family_id, kind, added_by) values (fam_b, 'nap', 'nanny');
    raise exception 'FAIL staff wrote into another household';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin
    insert into family_children (family_id, name) values (fam_a, 'x');
    raise exception 'FAIL staff added a child';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin
    insert into planner_entries (family_id, entry_date, title, added_by, entry_type, approval)
      values (fam_a, current_date, 'x', 'nanny', 'shift_change', 'approved');
    raise exception 'FAIL staff approved their own shift change';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin
    select secret_value into s from house_manual_entries limit 1;
    raise exception 'FAIL staff read a house manual secret';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Owner A: corrects any care entry; medication is never changed or removed.
  perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update care_events set detail = 'p' where family_id = fam_a; get diagnostics n = row_count;
  if n <> 2 then raise exception 'FAIL parent corrected % care entries (want 2)', n; end if;
  update medication_doses set dose = '2' where id = med_a; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL a medication record was changed'; end if;
  delete from medication_doses where id = med_a; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL a medication record was removed'; end if;
  begin
    select secret_value into s from house_manual_entries limit 1;
    raise exception 'FAIL the app read a house manual secret';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Owner B and an outsider see nothing of A.
  perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from family_children where family_id = fam_a; if n <> 0 then raise exception 'FAIL owner B sees A children'; end if;
  select count(*) into n from care_events where family_id = fam_a; if n <> 0 then raise exception 'FAIL owner B sees A care log'; end if;
  select count(*) into n from household_basics where id = fam_a; if n <> 0 then raise exception 'FAIL owner B sees A household'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_out, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from family_children; if n <> 0 then raise exception 'FAIL outsider children: %', n; end if;
  select count(*) into n from care_events; if n <> 0 then raise exception 'FAIL outsider care log: %', n; end if;
  select count(*) into n from medication_doses; if n <> 0 then raise exception 'FAIL outsider medication: %', n; end if;
  select count(*) into n from household_basics; if n <> 0 then raise exception 'FAIL outsider households: %', n; end if;
  reset role;

  -- Phase 4: anyone in the household ends a running nap (website behaviour); nobody outside can.
  update care_events set ended_at = null where id = care_a;
  perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if end_nap(care_a) then raise exception 'FAIL owner B ended a nap in household A'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if not end_nap(care_a) then raise exception 'FAIL staff could not end a nap a parent started'; end if;
  if end_nap(care_a) then raise exception 'FAIL a nap was ended twice'; end if;
  reset role;
  select count(*) into n from care_events where id = care_a and ended_at is not null and detail = 'p';
  if n <> 1 then raise exception 'FAIL ending a nap changed more than the wake-up time'; end if;

  -- V2 groups 3 to 6: messages, work and money, staff records, settings. Pat rejoins A, so A has two staff.
  update household_members set status = 'active' where family_id = fam_a and person_id = p_pat;
  insert into timesheet_shifts (family_id, nanny_id, shift_date, start_time, end_time) values
    (fam_a, nan_a1, current_date, '08:00', '17:00'), (fam_a, nan_a2, current_date, '08:00', '17:00');
  insert into expense_claims (family_id, nanny_id, item) values (fam_a, nan_a1, 'Pat train'), (fam_a, nan_a2, 'Lee train');
  insert into household_threads (id, family_id, title, created_by, last_sender) values (thr_a, fam_a, 'A chat', 'family', 'family');
  insert into household_messages (thread_id, sender, body) values (thr_a, 'family', 'hello');

  -- Phase 4 calendar: staff remove only their own items; the other side approves a shift change.
  declare note_lee uuid; chg_lee uuid; chg_oa uuid; denied boolean := false; begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by) values (fam_a, current_date, 'Lee note', 'note', 'nanny') returning id into note_lee;
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by, approval) values (fam_a, current_date, 'Lee change', 'shift_change', 'nanny', 'pending') returning id into chg_lee;
    begin
      insert into planner_entries (family_id, entry_date, title, entry_type, added_by, created_by) values (fam_a, current_date, 'as Pat', 'note', 'nanny', u_pat);
    exception when insufficient_privilege then denied := true; end;
    if not denied then raise exception 'FAIL staff added a calendar item in someone else''s name'; end if;
    if review_shift_change(chg_lee, 'approved') then raise exception 'FAIL staff approved their own shift change'; end if;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from planner_entries where id = note_lee; get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL staff removed another staff member''s calendar item'; end if;
    if review_shift_change(chg_lee, 'approved') then raise exception 'FAIL staff approved another staff member''s shift change'; end if;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from planner_entries where id = note_lee; get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL staff could not remove their own calendar item'; end if;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    if review_shift_change(chg_lee, 'declined') then raise exception 'FAIL owner B decided household A''s shift change'; end if;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by, approval) values (fam_a, current_date, 'Owner change', 'shift_change', 'family', 'pending') returning id into chg_oa;
    if review_shift_change(chg_oa, 'approved') then raise exception 'FAIL a parent approved their own shift change'; end if;
    if review_shift_change(chg_lee, 'maybe') then raise exception 'FAIL a shift change took a made-up decision'; end if;
    if not review_shift_change(chg_lee, 'approved') then raise exception 'FAIL a parent could not approve a staff shift change'; end if;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    if not review_shift_change(chg_oa, 'declined') then raise exception 'FAIL staff could not decide a parent''s shift change'; end if;
    if review_shift_change(chg_oa, 'approved') then raise exception 'FAIL a shift change was decided twice'; end if;
    reset role;
    select count(*) into n from planner_entries where id in (chg_lee, chg_oa) and ((id = chg_lee and approval = 'approved') or (id = chg_oa and approval = 'declined'));
    if n <> 2 then raise exception 'FAIL shift change decisions were not saved'; end if;
  end;
  -- Recurring commitments: one row per week linked by series_id; the responsible nanny must be in the same household.
  declare ser uuid := gen_random_uuid(); denied boolean := false; begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by, series_id, nanny_id)
      select fam_a, current_date + 7 * w, 'Lee violin', 'activity', 'nanny', ser, nan_a2 from generate_series(0, 2) w;
    begin
      insert into planner_entries (family_id, entry_date, title, entry_type, added_by, nanny_id) values (fam_a, current_date, 'B nanny', 'activity', 'nanny', nan_b1);
    exception when foreign_key_violation then denied := true; end;
    if not denied then raise exception 'FAIL a calendar item named a nanny from another household'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    delete from planner_entries where series_id = ser; get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL staff removed another staff member''s weekly commitment'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    delete from planner_entries where series_id = ser and entry_date > current_date; get diagnostics n = row_count;
    if n <> 2 then raise exception 'FAIL staff could not stop their own weekly commitment: %', n; end if;
    reset role;
  end;
  -- Planned vs actual: either side records what happened, today or earlier only, never in another household.
  declare plan_today uuid; plan_later uuid; chg uuid; begin
    insert into planner_entries (family_id, entry_date, time_label, title, entry_type, added_by) values (fam_a, current_date, '15:00', 'Swim', 'activity', 'family') returning id into plan_today;
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by) values (fam_a, current_date + 2, 'Later swim', 'activity', 'family') returning id into plan_later;
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by, approval) values (fam_a, current_date, 'Change', 'shift_change', 'family', 'pending') returning id into chg;
    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    if record_outcome(plan_today, 'done') then raise exception 'FAIL owner B recorded household A''s outcome'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    if record_outcome(plan_later, 'done') then raise exception 'FAIL an outcome was recorded before the day'; end if;
    if record_outcome(chg, 'done') then raise exception 'FAIL a shift change took an outcome'; end if;
    if record_outcome(plan_today, 'maybe') then raise exception 'FAIL an outcome took a made-up value'; end if;
    if not record_outcome(plan_today, 'done', '15:20', '16:05') then raise exception 'FAIL staff could not record a parent''s item as done'; end if;
    reset role;
    select count(*) into n from planner_entries where id = plan_today and outcome = 'done' and actual_start = '15:20' and actual_end = '16:05' and time_label = '15:00' and outcome_by = u_lee;
    if n <> 1 then raise exception 'FAIL the outcome or the planned time was not kept'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    if not record_outcome(plan_today, null) then raise exception 'FAIL a parent could not clear an outcome'; end if;
    reset role;
    select count(*) into n from planner_entries where id = plan_today and outcome is null and actual_start is null and outcome_by is null;
    if n <> 1 then raise exception 'FAIL clearing left the old outcome behind'; end if;
  end;
  -- Quick log layout: one per household, either side may change it, only known buttons, never another household's.
  perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if set_quick_actions(fam_a, array['note']) then raise exception 'FAIL owner B changed household A''s quick log'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
  if set_quick_actions(fam_a, array['note', 'sun_cream']) then raise exception 'FAIL the quick log took a made-up button'; end if;
  if set_quick_actions(fam_a, array['note', 'note']) then raise exception 'FAIL the quick log took a button twice'; end if;
  if not set_quick_actions(fam_a, array['potty', 'note']) then raise exception 'FAIL staff could not arrange the quick log'; end if;
  select count(*) into n from household_basics where id = fam_a and quick_actions = array['potty', 'note'];
  if n <> 1 then raise exception 'FAIL the quick log layout was not saved'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
  if not set_quick_actions(fam_a, null) then raise exception 'FAIL a parent could not reset the quick log'; end if;
  reset role;
  -- Editing: same rule as removing; a series is edited from a week onwards; shift changes and others' items refused.
  declare ser uuid := gen_random_uuid(); mid uuid; par uuid; chg uuid; begin
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by, created_by, series_id) values
      (fam_a, current_date + 1, 'Violin', 'activity', 'nanny', u_lee, ser),
      (fam_a, current_date + 8, 'Violin', 'activity', 'nanny', u_lee, ser),
      (fam_a, current_date + 15, 'Violin', 'activity', 'nanny', u_lee, ser);
    select id into mid from planner_entries where series_id = ser and entry_date = current_date + 8;
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by) values (fam_a, current_date + 1, 'Parent item', 'note', 'family') returning id into par;
    insert into planner_entries (family_id, entry_date, title, entry_type, added_by, approval) values (fam_a, current_date + 1, 'Change', 'shift_change', 'family', 'pending') returning id into chg;
    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    if edit_planner_entry(mid, true, 'Hacked', null, null, null, null, null) <> 0 then raise exception 'FAIL owner B edited household A''s item'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    if edit_planner_entry(par, false, 'Mine now', null, null, null, null, null) <> 0 then raise exception 'FAIL staff edited a parent''s item'; end if;
    if edit_planner_entry(chg, false, 'Moved', null, null, null, null, null) <> 0 then raise exception 'FAIL a shift change was edited'; end if;
    if edit_planner_entry(mid, true, 'Cello', '16:00', null, 'Mia', null, null) <> 2 then raise exception 'FAIL staff could not edit their own series from a week onwards'; end if;
    reset role;
    select count(*) into n from planner_entries where series_id = ser and title = 'Cello' and time_label = '16:00' and entry_date >= current_date + 8 and added_by = 'nanny';
    if n <> 2 then raise exception 'FAIL the later weeks were not edited'; end if;
    select count(*) into n from planner_entries where series_id = ser and title = 'Violin' and entry_date = current_date + 1;
    if n <> 1 then raise exception 'FAIL an earlier week was edited'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    if edit_planner_entry(mid, false, '', '17:00', null, null, null, null) <> 1 then raise exception 'FAIL a parent could not edit staff''s week'; end if;
    reset role;
    select count(*) into n from planner_entries where id = mid and title = 'Cello' and time_label = '17:00';
    if n <> 1 then raise exception 'FAIL an empty title wiped the title or the time was not kept'; end if;
  end;
  insert into push_subscriptions (family_id, slug, role, endpoint, user_id) values (fam_a, 's', 'family', 'https://push.test.invalid/a', uo_a);

  perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from timesheet_shifts; if n <> 1 then raise exception 'FAIL Lee timesheets: % (want only their own)', n; end if;
  select count(*) into n from expense_claims; if n <> 1 then raise exception 'FAIL Lee expenses: % (want only their own)', n; end if;
  select count(*) into n from household_staff where family_id = fam_a; if n <> 2 then raise exception 'FAIL Lee colleagues: % (want 2)', n; end if;
  select count(*) into n from staff_profiles; if n <> 1 then raise exception 'FAIL Lee full profiles: % (want own only)', n; end if;
  select count(*) into n from family_nannies; if n <> 0 then raise exception 'FAIL staff read the raw staff table'; end if;
  insert into timesheet_shifts (family_id, nanny_id, shift_date, start_time, end_time, submitted_by, status)
    values (fam_a, nan_a2, current_date, '18:00', '20:00', 'nanny', 'pending');
  begin
    insert into timesheet_shifts (family_id, nanny_id, shift_date, start_time, end_time, submitted_by, status)
      values (fam_a, nan_a1, current_date, '18:00', '20:00', 'nanny', 'pending');
    raise exception 'FAIL staff submitted a timesheet for a colleague';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin
    insert into timesheet_shifts (family_id, nanny_id, shift_date, start_time, end_time, submitted_by, status)
      values (fam_a, nan_a2, current_date, '18:00', '20:00', 'nanny', 'approved');
    raise exception 'FAIL staff approved their own timesheet';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  select count(*) into n from household_messages; if n <> 1 then raise exception 'FAIL Lee messages: % (want 1)', n; end if;
  insert into household_messages (thread_id, sender, body) values (thr_a, 'nanny', 'hi');
  begin
    insert into household_messages (thread_id, sender, body) values (thr_a, 'family', 'posing');
    raise exception 'FAIL staff sent a message posing as a parent';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  select count(*) into n from push_subscriptions; if n <> 0 then raise exception 'FAIL Lee sees someone else''s alerts'; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from timesheet_shifts; if n <> 3 then raise exception 'FAIL owner A timesheets: % (want 3)', n; end if;
  select count(*) into n from staff_profiles; if n <> 2 then raise exception 'FAIL owner A staff profiles: % (want 2)', n; end if;
  select count(*) into n from push_subscriptions; if n <> 1 then raise exception 'FAIL owner A alerts: % (want own 1)', n; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from timesheet_shifts where family_id = fam_a; if n <> 0 then raise exception 'FAIL owner B sees A timesheets'; end if;
  select count(*) into n from household_staff where family_id = fam_a; if n <> 0 then raise exception 'FAIL owner B sees A staff'; end if;
  select count(*) into n from household_messages; if n <> 0 then raise exception 'FAIL owner B sees A messages'; end if;
  reset role;

  -- Phase 1: support access only by a family's grant, every grant logged; the audit log cannot be changed.
  perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into support_access_grants (family_id, reason) values (fam_a, 'help with timesheets'); -- default: 7 days
  begin
    insert into support_access_grants (family_id, reason, expires_at) values (fam_a, 'x', now() + interval '8 days');
    raise exception 'FAIL a support grant could last longer than 7 days';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  update support_access_grants set revoked_at = now() where family_id = fam_a;
  get diagnostics n = row_count; if n <> 1 then raise exception 'FAIL owner A could not withdraw support access'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from support_access_grants; if n <> 0 then raise exception 'FAIL owner B sees A support grants'; end if;
  begin
    insert into support_access_grants (family_id, reason, expires_at) values (fam_a, 'x', now() + interval '1 day');
    raise exception 'FAIL owner B granted support access to household A';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from support_access_grants; if n <> 0 then raise exception 'FAIL staff see support grants'; end if;
  begin
    insert into support_access_grants (family_id, reason, expires_at) values (fam_a, 'x', now() + interval '1 day');
    raise exception 'FAIL staff granted support access';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin
    select count(*) into n from audit_log;
    if n <> 0 then raise exception 'FAIL staff read the audit log'; end if;
  exception when insufficient_privilege then null; end;
  reset role;
  select count(*) into n from audit_log where family_id = fam_a and action in ('support_access.granted', 'support_access.withdrawn');
  if n <> 2 then raise exception 'FAIL support grant and withdrawal logged % times (want 2)', n; end if;
  begin
    update audit_log set reason = 'edited' where family_id = fam_a;
    raise exception 'FAIL the audit log could be edited';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin
    delete from audit_log where family_id = fam_a;
    raise exception 'FAIL the audit log could be deleted from';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  -- Whole database: every table has row protection on, and no policy opens anything to signed-out visitors.
  select count(*) into n from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity;
  if n <> 0 then raise exception 'FAIL % tables have row protection switched off', n; end if;
  select count(*) into n from pg_policies where schemaname in ('public', 'storage') and roles && array['anon', 'public']::name[];
  if n <> 0 then raise exception 'FAIL % policies are open to signed-out visitors', n; end if;
  select count(*) into n from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r', 'v')
    and has_table_privilege('anon', oid, 'select, insert, update, delete');
  if n <> 0 then raise exception 'FAIL signed-out visitors can still reach % tables', n; end if;
  select count(*) into n from pg_proc where pronamespace = 'public'::regnamespace and has_function_privilege('anon', oid, 'execute');
  if n <> 0 then raise exception 'FAIL signed-out visitors can run % functions', n; end if;
  if has_function_privilege('authenticated', 'public.purge_family(uuid, text)', 'execute') then
    raise exception 'FAIL signed-in people can run the household purge'; end if;
  select count(*) into n from pg_policies where schemaname = 'storage' and qual ilike '%has_role%';
  if n <> 0 then raise exception 'FAIL the team can still open family files without a grant'; end if;

  -- Phase 5: uploading staff documents. Parents for any staff, staff for themselves, never into another household.
  declare ok uuid; f text; denied boolean; begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    f := 'vault/' || fam_a || '/lee-test.pdf';
    insert into storage.objects (bucket_id, name, owner_id, metadata) values ('family-docs', f, u_lee::text, '{"size": 2048, "mimetype": "application/pdf"}');
    ok := add_staff_document(fam_a, nan_a2, 'dbs', 'Lee DBS', f, 'dbs.pdf', '2026-01-01', '2029-01-01');
    select count(*) into n from wallet_documents where id = ok and uploaded_by = 'nanny' and uploaded_by_nanny_id = nan_a2;
    if n <> 1 then raise exception 'FAIL Lee could not add her own document'; end if;
    denied := false; begin perform add_staff_document(fam_a, nan_a1, 'dbs', 'x', f, 'x.pdf', null, null); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL Lee added a document for Pat'; end if;
    denied := false; begin
      insert into storage.objects (bucket_id, name, owner_id, metadata) values ('family-docs', 'vault/' || fam_b || '/x.pdf', u_lee::text, '{}');
    exception when others then denied := true; end;
    if not denied then raise exception 'FAIL Lee put a file in family B''s folder'; end if;
    insert into storage.objects (bucket_id, name, owner_id, metadata) values ('family-docs', 'vault/' || fam_a || '/big.pdf', u_lee::text, '{"size": 20000000, "mimetype": "application/pdf"}');
    denied := false; begin perform add_staff_document(fam_a, nan_a2, 'dbs', 'x', 'vault/' || fam_a || '/big.pdf', 'x.pdf', null, null); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a 20 MB file was accepted'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_out, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin
      insert into storage.objects (bucket_id, name, owner_id, metadata) values ('family-docs', 'vault/' || fam_a || '/out.pdf', u_out::text, '{}');
    exception when others then denied := true; end;
    if not denied then raise exception 'FAIL an outsider uploaded into family A'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    f := 'vault/' || fam_a || '/owner-test.png';
    insert into storage.objects (bucket_id, name, owner_id, metadata) values ('family-docs', f, uo_a::text, '{"size": 100, "mimetype": "image/png"}');
    denied := false; begin perform add_staff_document(fam_a, nan_a1, 'id', 'x', 'vault/' || fam_a || '/lee-test.pdf', 'x', null, null); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL owner recorded a file someone else uploaded'; end if;
    ok := add_staff_document(fam_a, nan_a1, 'id', 'Pat ID', f, 'id.png', null, '2030-05-01');
    select count(*) into n from wallet_documents where id = ok and uploaded_by = 'family' and nanny_id = nan_a1;
    if n <> 1 then raise exception 'FAIL owner could not add a document for Pat'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from wallet_documents where id = ok; if n <> 0 then raise exception 'FAIL Lee sees Pat''s new document'; end if;
    reset role;
  end;

  -- Phase 5: timesheets. Staff submit their own as pending; only a parent of that household approves or declines.
  declare sid uuid; denied boolean; begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into timesheet_shifts (family_id, nanny_id, shift_date, start_time, end_time, submitted_by, status)
      values (fam_a, nan_a2, '2026-11-10', '08:00', '18:00', 'nanny', 'pending') returning id into sid;
    denied := false; begin
      insert into timesheet_shifts (family_id, nanny_id, shift_date, start_time, end_time, submitted_by, status)
        values (fam_a, nan_a2, '2026-11-11', '08:00', '18:00', 'nanny', 'approved');
    exception when others then denied := true; end;
    if not denied then raise exception 'FAIL Lee submitted a shift already approved'; end if;
    denied := false; begin perform review_shift(sid, 'approved'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL Lee approved her own shift'; end if;
    update timesheet_shifts set status = 'approved' where id = sid;
    reset role;
    select count(*) into n from timesheet_shifts where id = sid and status = 'pending';
    if n <> 1 then raise exception 'FAIL Lee changed her shift''s status directly'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform review_shift(sid, 'approved'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B''s parent approved family A''s shift'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform review_shift(sid, 'paid'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a shift was set to an unknown status'; end if;
    perform review_shift(sid, 'declined');
    reset role;
    select count(*) into n from timesheet_shifts where id = sid and status = 'declined' and reviewed_at is not null;
    if n <> 1 then raise exception 'FAIL the parent could not decline the shift'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from timesheet_shifts where id = sid; if n <> 0 then raise exception 'FAIL Pat sees Lee''s shift'; end if;
    reset role;
  end;

  raise exception 'ISOLATION_TEST_PASSED: owners, multi-household staff, other staff, outsiders, ended members, anonymous and writes all behaved';
end $$;
