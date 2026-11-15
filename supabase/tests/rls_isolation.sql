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

  -- Phase 5: messages and photos. Reading clears only your own dot; photos stay in the household's photos folder.
  declare tid uuid; mid uuid; f text; denied boolean; begin
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into household_threads (family_id, title, created_by, last_sender, nanny_unread) values (fam_a, 'Test', 'family', 'family', true) returning id into tid;
    insert into household_messages (thread_id, sender, sender_name, body) values (tid, 'family', 'Parent', 'Hello');
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform mark_thread_read(tid);
    reset role;
    select count(*) into n from household_threads where id = tid and not nanny_unread and last_sender = 'family';
    if n <> 1 then raise exception 'FAIL staff reading did not clear their dot, or changed who spoke last'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform mark_thread_read(tid); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B marked family A''s conversation read'; end if;
    denied := false; begin
      insert into storage.objects (bucket_id, name, owner_id, metadata) values ('family-docs', 'moments/' || fam_a || '/b.jpg', uo_b::text, '{}');
    exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B uploaded into family A''s photos'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    f := 'moments/' || fam_a || '/lee.jpg';
    insert into storage.objects (bucket_id, name, owner_id, metadata) values ('family-docs', f, u_lee::text, '{"size": 1000, "mimetype": "image/jpeg"}');
    insert into family_moments (family_id, kind, moment_date, storage_path, added_by) values (fam_a, 'photo', '2026-11-14', f, 'nanny') returning id into mid;
    -- a photo record aimed at a vault document must not open it
    insert into family_moments (family_id, kind, moment_date, storage_path, added_by) values (fam_a, 'photo', '2026-11-14', 'vault/' || fam_a || '/owner-test.png', 'nanny');
    select count(*) into n from storage.objects where name = 'vault/' || fam_a || '/owner-test.png';
    if n <> 0 then raise exception 'FAIL a photo record opened a vault document'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from storage.objects where name = f; if n <> 1 then raise exception 'FAIL Pat cannot see the household photo'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from storage.objects where name = f; if n <> 0 then raise exception 'FAIL family B sees family A''s photo'; end if;
    reset role;
  end;

  -- Phase 5: app push. Phones register only through save_push_token; pushes go to the other side, generic, and
  -- respect muted kinds and quiet hours. Requests are only queued here and never leave, as the test rolls back.
  declare tid uuid; denied boolean; q bigint; tok_o text := 'ExponentPushToken[ownerAAAAAAAA]'; tok_l text := 'ExponentPushToken[leeLLLLLLLLLL]';
    sent int; h int := extract(hour from now() at time zone 'Europe/London')::int; begin
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform save_push_token(fam_a, tok_o, 'Europe/London');
    insert into household_threads (family_id, title, created_by, last_sender) values (fam_a, 'Push', 'family', 'family') returning id into tid;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin
      insert into app_push_tokens (family_id, role, token) values (fam_a, 'nanny', tok_l);
    exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a phone was added without save_push_token'; end if;
    perform save_push_token(fam_a, tok_l, 'Not/AZone');
    select count(*) into n from app_push_tokens; if n <> 1 then raise exception 'FAIL Lee sees phones other than her own'; end if;
    denied := false; begin update app_push_tokens set muted = array['bogus']; exception when others then denied := true; end;
    if not denied then raise exception 'FAIL an unknown kind was muted'; end if;
    denied := false; begin perform push_to_app(fam_a, 'nanny', 'messages', 'x'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a user called the push sender directly'; end if;
    reset role;
    select count(*) into n from app_push_tokens where token = tok_l and tz = 'Europe/London';
    if n <> 1 then raise exception 'FAIL a bad time zone was saved'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform save_push_token(fam_a, 'ExponentPushToken[outsiderBBBBBB]', 'Europe/London'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B registered a phone with family A'; end if;
    reset role;

    select coalesce(max(id), 0) into q from net.http_request_queue;
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into household_messages (thread_id, sender, sender_name, body) values (tid, 'nanny', 'Lee', 'Secret words');
    reset role;
    select count(*) into sent from net.http_request_queue where id > q and convert_from(body, 'utf8') like '%' || tok_o || '%'
      and convert_from(body, 'utf8') like '%New message%' and convert_from(body, 'utf8') not like '%Secret%' and convert_from(body, 'utf8') not like '%Lee%';
    if sent <> 1 then raise exception 'FAIL the parent''s phone did not get one generic message push'; end if;
    select count(*) into n from net.http_request_queue where id > q and convert_from(body, 'utf8') like '%' || tok_l || '%';
    if n <> 0 then raise exception 'FAIL the sender was pushed about her own message'; end if;
    select count(*) into n from wallet_activity where family_id = fam_a and feature = 'messages' and actor = 'nanny';
    if n < 1 then raise exception 'FAIL an app message did not reach the website badges'; end if;

    -- muted kind, plain diary note, then a diary highlight
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update app_push_tokens set muted = array['messages'];
    reset role;
    select coalesce(max(id), 0) into q from net.http_request_queue;
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into household_messages (thread_id, sender, sender_name, body) values (tid, 'nanny', 'Lee', 'Again');
    insert into daily_logs (family_id, log_date, notes) values (fam_a, '2026-11-14', 'Plain note');
    reset role;
    select count(*) into n from net.http_request_queue where id > q;
    if n <> 0 then raise exception 'FAIL a muted message or a plain diary note pushed'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into daily_logs (family_id, log_date, notes, is_highlight) values (fam_a, '2026-11-14', 'Big day', true);
    reset role;
    select count(*) into n from net.http_request_queue where id > q and convert_from(body, 'utf8') like '%New highlight%'
      and convert_from(body, 'utf8') like '%' || tok_o || '%' and convert_from(body, 'utf8') not like '%Big day%';
    if n <> 1 then raise exception 'FAIL a diary highlight did not push to the parent'; end if;

    -- quiet hours covering now
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update app_push_tokens set muted = '{}', quiet_start = h, quiet_end = (h + 1) % 24;
    reset role;
    select coalesce(max(id), 0) into q from net.http_request_queue;
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into household_messages (thread_id, sender, sender_name, body) values (tid, 'nanny', 'Lee', 'Late');
    reset role;
    select count(*) into n from net.http_request_queue where id > q;
    if n <> 0 then raise exception 'FAIL a push was sent during quiet hours'; end if;

    -- a phone handed to Pat stops getting Lee's pushes
    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform save_push_token(fam_a, tok_l, 'Europe/London');
    reset role;
    select count(*) into n from app_push_tokens where token = tok_l and user_id = u_lee;
    if n <> 0 then raise exception 'FAIL a reused phone kept the previous user''s registration'; end if;
  end;

  -- Profile photos and who is online: own folder only, parents for children and staff, staff only for themselves.
  declare kid uuid := gen_random_uuid(); fa text := 'avatars/' || fam_a || '/lee.jpg'; fk text := 'avatars/' || fam_a || '/kid.jpg';
    denied boolean; begin
    insert into family_children (id, family_id, name) values (kid, fam_a, 'Kid A');
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into storage.objects (bucket_id, name, owner_id, metadata) values ('family-docs', fa, u_lee::text, '{}'), ('family-docs', fk, u_lee::text, '{}');
    denied := false; begin
      insert into storage.objects (bucket_id, name, owner_id, metadata) values ('family-docs', 'avatars/' || fam_b || '/x.jpg', u_lee::text, '{}');
    exception when others then denied := true; end;
    if not denied then raise exception 'FAIL Lee uploaded a photo into another household'; end if;
    perform set_profile_photo(fam_a, 'me', null, fa);
    denied := false; begin perform set_profile_photo(fam_a, 'child', kid, fk); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff changed a child''s photo'; end if;
    denied := false; begin perform set_profile_photo(fam_a, 'staff', nan_a1, fa); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff changed another staff member''s photo'; end if;
    denied := false; begin perform set_profile_photo(fam_a, 'me', null, 'vault/' || fam_a || '/3'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a profile photo pointed at a vault file'; end if;
    denied := false; begin perform set_profile_photo(fam_a, 'me', null, 'avatars/' || fam_a || '/missing.jpg'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a profile photo pointed at a file that was never uploaded'; end if;
    perform i_am_here(fam_a);
    select count(*) into n from household_photos(fam_a) where kind = 'staff' and me and online and photo_path = fa;
    if n <> 1 then raise exception 'FAIL Lee''s own photo or online dot is missing'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform set_profile_photo(fam_a, 'child', kid, fk);
    select count(*) into n from household_photos(fam_a) where kind = 'child' and photo_path = fk;
    if n <> 1 then raise exception 'FAIL a parent could not set a child''s photo'; end if;
    select count(*) into n from storage.objects where name in (fa, fk);
    if n <> 2 then raise exception 'FAIL the household cannot see its own profile photos'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from household_photos(fam_a);
    if n <> 0 then raise exception 'FAIL family B listed family A''s people'; end if;
    select count(*) into n from storage.objects where name in (fa, fk);
    if n <> 0 then raise exception 'FAIL family B can open family A''s profile photos'; end if;
    denied := false; begin perform i_am_here(fam_a); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B marked itself online in family A'; end if;
    reset role;
  end;

  -- Day to day pages: staff reports wait for sign-off, only a parent signs off or reviews expenses, nothing crosses homes.
  declare inc uuid := gen_random_uuid(); exp uuid := gen_random_uuid(); denied boolean; begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin
      insert into incident_reports (family_id, child_name, what_happened, reported_by, acknowledged_at) values (fam_a, 'Kid', 'Fell', 'nanny', now());
    exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff signed off their own incident report'; end if;
    insert into incident_reports (id, family_id, child_name, what_happened, reported_by) values (inc, fam_a, 'Kid', 'Fell', 'nanny');
    denied := false; begin perform acknowledge_incident(inc); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff signed off an incident report'; end if;
    delete from incident_reports where id = inc;
    insert into expense_claims (id, family_id, nanny_id, item, amount, submitted_by, status) values (exp, fam_a, nan_a2, 'Bus', 3, 'nanny', 'pending');
    denied := false; begin perform review_expense(exp, 'reimbursed'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff reviewed their own expense'; end if;
    reset role;
    select count(*) into n from incident_reports where id = inc;
    if n <> 1 then raise exception 'FAIL an incident report was removed'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform acknowledge_incident(inc); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B signed off family A''s report'; end if;
    denied := false; begin perform review_expense(exp, 'declined'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B reviewed family A''s expense'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    if not acknowledge_incident(inc) then raise exception 'FAIL a parent could not sign off a report'; end if;
    if acknowledge_incident(inc) then raise exception 'FAIL a report was signed off twice'; end if;
    perform review_expense(exp, 'reimbursed');
    denied := false; begin perform review_expense(exp, 'pending'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL an expense was set to something other than reimbursed or declined'; end if;
    reset role;
    select count(*) into n from incident_reports where id = inc and acknowledged_by_name = 'Owner A';
    if n <> 1 then raise exception 'FAIL the sign-off did not record the parent''s name'; end if;
    select count(*) into n from expense_claims where id = exp and status = 'reimbursed' and reviewed_at is not null;
    if n <> 1 then raise exception 'FAIL the expense review did not save'; end if;
  end;

  -- Family and home: playbook sections for staff, house codes, travel checklist and notes.
  declare door uuid; trip uuid := gen_random_uuid(); pb uuid; denied boolean; v text; begin
    select id into door from house_manual_entries where family_id = fam_a;
    insert into travel_trips (id, family_id, destination, start_date, end_date) values (trip, fam_a, 'Test villa', current_date, current_date + 7);

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin insert into kids_playbook_entries (family_id, category, title, added_by) values (fam_a, 'comfort', 'x', 'nanny');
      exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff added to a parents-only playbook section'; end if;
    insert into kids_playbook_entries (family_id, category, title, added_by) values (fam_a, 'activities', 'Den building', 'nanny') returning id into pb;
    denied := false; begin update kids_playbook_entries set category = 'handle' where id = pb; exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff moved an idea into a parents-only section'; end if;
    perform reveal_house_code(door);
    denied := false; begin perform set_house_code(door, '9999'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff set a house code'; end if;
    update travel_trips set destination = 'Changed' where id = trip;
    perform travel_checklist(trip, 'add', 'Armbands');
    perform add_travel_note(trip, 'pool', 'In the pool 10 to 11');
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform reveal_house_code(door); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B saw family A''s house code'; end if;
    denied := false; begin perform travel_checklist(trip, 'add', 'x'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B changed family A''s checklist'; end if;
    denied := false; begin perform add_travel_note(trip, 'general', 'x'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B added a note to family A''s trip'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform set_house_code(door, ' 1234 ');
    v := reveal_house_code(door);
    if v is distinct from '1234' then raise exception 'FAIL a parent could not set and show a code'; end if;
    reset role;

    select count(*) into n from travel_trips where id = trip and destination = 'Test villa'
      and jsonb_array_length(checklist) = 1 and handover_notes->0->>'authorName' = 'Lee' and handover_notes->0->>'authorRole' = 'nanny';
    if n <> 1 then raise exception 'FAIL staff changed a trip, or the checklist or note did not save'; end if;
    select count(*) into n from house_manual_entries where id = door and has_secret;
    if n <> 1 then raise exception 'FAIL the code was not stored'; end if;
  end;

  -- Groceries: one shared list; buying with your own money adds a private expense in the same step.
  declare milk uuid; bread uuid; eggs uuid; exp uuid; denied boolean; begin
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into grocery_items (family_id, name, added_by) values (fam_a, 'Eggs', 'family') returning id into eggs;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into grocery_items (family_id, name, added_by) values (fam_a, 'Milk', 'nanny') returning id into milk;
    insert into grocery_items (family_id, name, added_by) values (fam_a, 'Bread', 'nanny') returning id into bread;
    denied := false; begin insert into grocery_items (family_id, name, added_by) values (fam_a, 'x', 'family'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff added a grocery item as a parent'; end if;
    delete from grocery_items where id = eggs;
    denied := false; begin perform buy_groceries(array[milk, bread], 0); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a grocery expense of 0 was accepted'; end if;
    exp := buy_groceries(array[milk, bread], 4.2);
    if exp is null then raise exception 'FAIL buying with an amount made no expense'; end if;
    delete from grocery_items where id = milk;
    denied := false; begin perform buy_groceries(array[milk], null); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL an item was bought twice'; end if;
    reset role;
    select count(*) into n from grocery_items where id in (eggs, milk);
    if n <> 2 then raise exception 'FAIL staff removed a parent''s item or a bought item'; end if;
    select count(*) into n from expense_claims where id = exp and nanny_id = nan_a2 and amount = 4.20 and category = 'food'
      and status = 'pending' and submitted_by = 'nanny' and item = 'Groceries: Milk, Bread';
    if n <> 1 then raise exception 'FAIL the grocery expense was not saved correctly'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from grocery_items where id = milk;
    if n <> 1 then raise exception 'FAIL other staff in the household could not see the list'; end if;
    select count(*) into n from expense_claims where id = exp;
    if n <> 0 then raise exception 'FAIL other staff saw a colleague''s grocery expense'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from grocery_items where family_id = fam_a;
    if n <> 0 then raise exception 'FAIL family B saw family A''s groceries'; end if;
    denied := false; begin perform buy_groceries(array[eggs], null); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B ticked off family A''s groceries'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform buy_groceries(array[eggs], 3); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a parent made a grocery expense in a nanny''s name'; end if;
    if buy_groceries(array[eggs], null) is not null then raise exception 'FAIL ticking off without an amount made an expense'; end if;
    reset role;
  end;

  -- Calendar extras: leave requests and live-in weeks through the app's functions.
  declare asked uuid; booked uuid; denied boolean; begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    asked := add_leave(fam_a, nan_a2, 'holiday', '2027-01-04', '2027-01-05', 2, 'Family visit');
    denied := false; begin perform add_leave(fam_a, nan_a1, 'holiday', '2027-01-04', '2027-01-05', 2); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff asked for leave for a colleague'; end if;
    denied := false; begin perform add_leave(fam_a, nan_a2, 'holiday', '2027-01-05', '2027-01-04', 2); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL leave ending before it starts was accepted'; end if;
    denied := false; begin perform review_leave(asked, 'approved'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff approved their own leave'; end if;
    perform log_live_in_week(fam_a, '2027-01-06', 31, 1, 'Extra evening');
    reset role;
    select count(*) into n from leave_requests where id = asked and status = 'pending' and requested_by = 'nanny' and days = 2;
    if n <> 1 then raise exception 'FAIL a staff leave request was not saved as waiting'; end if;
    select count(*) into n from live_in_weeks where family_id = fam_a and week_start = '2027-01-04' and hours_worked = 31 and days_off = 1;
    if n <> 1 then raise exception 'FAIL a staff live-in week was not saved on its Monday'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from leave_requests where id = asked;
    if n <> 0 then raise exception 'FAIL other staff saw a colleague''s leave'; end if;
    denied := false; begin perform remove_leave(asked); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL other staff removed a colleague''s leave'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform review_leave(asked, 'declined'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B answered family A''s leave'; end if;
    denied := false; begin perform add_leave(fam_a, nan_a2, 'holiday', '2027-02-01', '2027-02-01', 1); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B booked leave in family A'; end if;
    denied := false; begin perform log_live_in_week(fam_a, '2027-01-11', 10, 2); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B logged a live-in week in family A'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform review_leave(asked, 'approved');
    denied := false; begin perform review_leave(asked, 'declined'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL leave was answered twice'; end if;
    booked := add_leave(fam_a, nan_a1, 'sick', '2027-03-01', '2027-03-01', 1);
    reset role;
    select count(*) into n from leave_requests where id = booked and status = 'approved' and requested_by = 'family';
    if n <> 1 then raise exception 'FAIL a parent''s booking was not approved at once'; end if;
    select count(*) into n from planner_entries where family_id = fam_a and entry_type = 'leave' and entry_date in ('2027-01-04', '2027-03-01');
    if n <> 2 then raise exception 'FAIL approved leave did not go on the calendar'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform remove_leave(asked); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff removed leave after it was approved'; end if;
    reset role;
  end;

  -- Wallet: petty cash entries and "Paid from petty cash" in Groceries.
  declare topup uuid; spent uuid; juice uuid; fruit uuid; petty uuid; denied boolean; begin
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into petty_cash_entries (family_id, kind, entry_date, amount, description, added_by, added_by_name)
      values (fam_a, 'topup', current_date, 50, 'Cash for the week', 'family', 'Parent') returning id into topup;
    insert into grocery_items (family_id, name, added_by) values (fam_a, 'Fruit', 'family') returning id into fruit;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin insert into petty_cash_entries (family_id, kind, entry_date, amount, description, added_by, added_by_name)
      values (fam_a, 'topup', current_date, 10, 'x', 'nanny', 'x'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff added money to petty cash'; end if;
    insert into petty_cash_entries (family_id, kind, entry_date, amount, description, added_by, added_by_name)
      values (fam_a, 'spend', current_date, 3, 'Bus fare', 'nanny', 'Lee') returning id into spent;
    denied := false; begin perform remove_petty_cash(topup); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff removed a parent''s petty cash entry'; end if;
    insert into grocery_items (family_id, name, added_by) values (fam_a, 'Juice', 'nanny') returning id into juice;
    denied := false; begin perform buy_groceries(array[juice], null, true); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL petty cash groceries without an amount were accepted'; end if;
    petty := buy_groceries(array[juice], 2.5, true);
    reset role;
    select count(*) into n from petty_cash_entries where id = spent and created_by = u_lee;
    if n <> 1 then raise exception 'FAIL a petty cash entry did not record who added it'; end if;
    select count(*) into n from petty_cash_entries where id = petty and kind = 'spend' and added_by = 'nanny' and amount = 2.50
      and description = 'Groceries: Juice';
    if n <> 1 then raise exception 'FAIL petty cash groceries were not logged as spending'; end if;
    select count(*) into n from grocery_items where id = juice and petty_cash_id = petty and expense_id is null and bought_at is not null;
    if n <> 1 then raise exception 'FAIL the grocery item did not remember its petty cash entry'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from petty_cash_entries where id in (topup, spent, petty);
    if n <> 3 then raise exception 'FAIL other staff in the household could not see petty cash'; end if;
    denied := false; begin perform remove_petty_cash(spent); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL other staff removed a colleague''s petty cash entry'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from petty_cash_entries where family_id = fam_a;
    if n <> 0 then raise exception 'FAIL family B saw family A''s petty cash'; end if;
    denied := false; begin perform remove_petty_cash(topup); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B removed family A''s petty cash'; end if;
    denied := false; begin perform buy_groceries(array[fruit], 1, true); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B paid family A''s groceries from petty cash'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform remove_petty_cash(spent);
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    petty := buy_groceries(array[fruit], 4, true);
    perform remove_petty_cash(petty);
    perform remove_petty_cash(topup);
    reset role;
    select count(*) into n from petty_cash_entries where id in (topup, spent, petty);
    if n <> 0 then raise exception 'FAIL petty cash entries were not removed'; end if;
    select count(*) into n from grocery_items where id = fruit and petty_cash_id is null and bought_at is not null;
    if n <> 1 then raise exception 'FAIL removing petty cash broke the bought grocery item'; end if;
  end;

  -- Wallet: household documents (no staff member), shared with staff only when a parent says so.
  declare f text := 'vault/' || fam_a || '/house.pdf'; g text := 'vault/' || fam_a || '/staff-try.pdf'; hid uuid; sid uuid; p text; denied boolean; begin
    insert into storage.objects (bucket_id, name, owner_id, metadata) values ('family-docs', f, uo_a::text, '{"size": 2048, "mimetype": "application/pdf"}'),
      ('family-docs', g, u_lee::text, '{"size": 2048, "mimetype": "application/pdf"}');
    select id into sid from wallet_documents where family_id = fam_a and nanny_id is not null limit 1;
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    hid := add_staff_document(fam_a, null, 'insurance', 'Home insurance', f, 'house.pdf', null, '2027-06-01', false);
    reset role;
    select count(*) into n from wallet_documents where id = hid and nanny_id is null and not shared_with_staff and uploaded_by = 'family';
    if n <> 1 then raise exception 'FAIL a household document was not saved correctly'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform add_staff_document(fam_a, null, 'other', 'x', g, 'x.pdf', null, null, true); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff added a household document'; end if;
    select count(*) into n from wallet_documents where id = hid;
    if n <> 0 then raise exception 'FAIL staff saw a household document that was not shared'; end if;
    denied := false; begin perform share_document(hid, true); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff shared a household document'; end if;
    denied := false; begin perform remove_document(hid); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL staff removed a household document'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform share_document(hid, true); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B shared family A''s document'; end if;
    denied := false; begin perform remove_document(hid); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B removed family A''s document'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform share_document(hid, true);
    denied := false; begin perform remove_document(sid); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL remove_document removed a staff member''s document'; end if;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from wallet_documents where id = hid;
    if n <> 1 then raise exception 'FAIL staff could not see a shared household document'; end if;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    p := remove_document(hid);
    reset role;
    if p is distinct from f then raise exception 'FAIL remove_document did not return the file to delete'; end if;
    select count(*) into n from wallet_documents where id in (hid, sid);
    if n <> 1 then raise exception 'FAIL removing a household document removed the wrong records'; end if;
  end;

  -- Bank details: only the nanny writes, and only her own row.
  declare denied boolean; begin
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform save_bank_details(fam_a, 'Parent', null, null, '12345678', null, null, null); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a parent saved bank details'; end if;
    denied := false; begin perform remove_bank_details(fam_a); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a parent removed bank details'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform save_bank_details(fam_a, 'Outsider', null, null, '12345678', null, null, null); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B saved bank details in family A'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform save_bank_details(fam_a, 'Lee', null, null, null, null, null, null); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL bank details with no account number or IBAN were accepted'; end if;
    denied := false; begin perform save_bank_details(fam_a, 'Lee', null, null, repeat('1', 35), null, null, null); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a too-long account number was accepted'; end if;
    perform save_bank_details(fam_a, ' Lee New ', 'Test Bank', '11-22-33', '87654321', '', null, 'NANNY LEE');
    select count(*) into n from nanny_bank_details;
    if n <> 1 then raise exception 'FAIL Lee sees bank details other than her own: %', n; end if;
    reset role;
    select count(*) into n from nanny_bank_details where family_id = fam_a and nanny_id = nan_a2 and account_name = 'Lee New'
      and account_number = '87654321' and iban is null and swift is null;
    if n <> 1 then raise exception 'FAIL Lee''s bank details were not saved correctly'; end if;
    select count(*) into n from nanny_bank_details where family_id = fam_a and nanny_id = nan_a1 and account_name = 't';
    if n <> 1 then raise exception 'FAIL saving changed a colleague''s bank details'; end if;

    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform remove_bank_details(fam_a);
    reset role;
    select count(*) into n from nanny_bank_details where nanny_id in (nan_a1, nan_a2, nan_b1);
    if n <> 2 then raise exception 'FAIL removing bank details removed the wrong rows'; end if;
    select count(*) into n from nanny_bank_details where nanny_id = nan_a1;
    if n <> 0 then raise exception 'FAIL Pat could not remove their own bank details'; end if;
  end;

  -- Agreement: issued and unchanged only, parent as parent, only the agreement's own nanny, once per role per version.
  declare denied boolean; ag uuid := gen_random_uuid(); v1 uuid := gen_random_uuid(); v2 uuid := gen_random_uuid(); begin
    insert into nanny_agreements (id, family_id, nanny_id, status, version, agreement_data, issued_at)
      values (ag, fam_a, nan_a2, 'issued', 1, '{"nannyName":"Lee","hourlyRate":"15"}', now());
    insert into agreement_versions (id, agreement_id, family_id, nanny_id, version, snapshot_text, content_hash)
      values (v1, ag, fam_a, nan_a2, 1, '{"hourlyRate":"15","nannyName":"Lee"}', 'hash1');

    perform set_config('request.jwt.claims', json_build_object('sub', uo_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform sign_agreement(fam_a, 'Outsider'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL family B signed family A''s agreement'; end if;
    if coalesce(agreement_on(fam_a), false) then raise exception 'FAIL agreement_on answered for another household'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform sign_agreement(fam_a, 'Pat Nanny'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a nanny signed another nanny''s agreement'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', u_lee, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform sign_agreement(fam_a, 'Le'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a 2-letter signature was accepted'; end if;
    perform sign_agreement(fam_a, ' Lee Nanny ');
    denied := false; begin perform sign_agreement(fam_a, 'Lee Nanny'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL the nanny signed the same version twice'; end if;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform sign_agreement(fam_a, 'Owner A');
    reset role;
    select count(*) into n from document_signatures where agreement_version_id = v1 and content_hash = 'hash1' and doc_version = '1'
      and ((signer_role = 'nanny' and signer_name = 'Lee Nanny') or (signer_role = 'parent' and signer_name = 'Owner A')) and nanny_id = nan_a2;
    if n <> 2 then raise exception 'FAIL agreement signatures were not recorded correctly: %', n; end if;

    -- Version 2 edited after issue, then a draft, then switched off: all refused.
    update nanny_agreements set version = 2, agreement_data = '{"nannyName":"Lee","hourlyRate":"16"}' where id = ag;
    insert into agreement_versions (id, agreement_id, family_id, nanny_id, version, snapshot_text, content_hash)
      values (v2, ag, fam_a, nan_a2, 2, '{"nannyName":"Lee","hourlyRate":"17"}', 'hash2');
    perform set_config('request.jwt.claims', json_build_object('sub', uo_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    denied := false; begin perform sign_agreement(fam_a, 'Owner A'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL an agreement edited since issue was signed'; end if;
    reset role;
    update agreement_versions set snapshot_text = '{"nannyName":"Lee","hourlyRate":"16"}' where id = v2;
    update nanny_agreements set status = 'draft' where id = ag;
    set local role authenticated;
    denied := false; begin perform sign_agreement(fam_a, 'Owner A'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL a draft agreement was signed'; end if;
    reset role;
    update nanny_agreements set status = 'issued' where id = ag;
    update families set agreement_policy = 'off' where id = fam_a;
    set local role authenticated;
    denied := false; begin perform sign_agreement(fam_a, 'Owner A'); exception when others then denied := true; end;
    if not denied then raise exception 'FAIL an agreement was signed while agreements were switched off'; end if;
    reset role;
    update families set agreement_policy = 'family' where id = fam_a;

    perform set_config('request.jwt.claims', json_build_object('sub', u_pat, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from document_signatures where family_id = fam_a;
    if n <> 0 then raise exception 'FAIL a nanny read another nanny''s agreement signatures: %', n; end if;
    reset role;
  end;

  raise exception 'ISOLATION_TEST_PASSED: owners, multi-household staff, other staff, outsiders, ended members, anonymous and writes all behaved';
end $$;
