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
  n int;
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
  insert into nanny_bank_details (family_id, nanny_id) values (fam_a, nan_a1), (fam_a, nan_a2), (fam_b, nan_b1);
  insert into house_manual_entries (family_id, category, title) values (fam_a, 'access', 'A door'), (fam_b, 'access', 'B door');
  insert into incident_reports (family_id, child_name, occurred_at, kind, severity, what_happened, reported_by) values
    (fam_a, 'c', now(), 'bump', 'minor', 'x', 'family'), (fam_b, 'c', now(), 'bump', 'minor', 'x', 'family');

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

  -- Not signed in: nothing readable.
  set local role anon;
  begin
    select count(*) into n from wallet_documents;
    if n <> 0 then raise exception 'FAIL anonymous read % documents', n; end if;
  exception when insufficient_privilege then null;
  end;
  reset role;

  raise exception 'ISOLATION_TEST_PASSED: owners, multi-household staff, other staff, outsiders, ended members, anonymous and writes all behaved';
end $$;
