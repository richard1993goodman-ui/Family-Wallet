-- Made-up households for the TEST COPY only (family-wallet-test). Never run on live.
-- It refuses to run if the database holds any household that is not one of these made-up ones, or if they are already loaded.
-- Two homes: the Harpers (two parents, two children, nanny Sophie and au pair Ana) and the Patels (one parent, one child,
-- the same nanny Sophie after school). All names, numbers and addresses are invented.
do $$
declare
  -- Sign-in identities (fixed ids so the app and tests can refer to them).
  u_olivia uuid := 'a0000000-0000-4000-8000-000000000001'; u_james uuid := 'a0000000-0000-4000-8000-000000000002';
  u_priya  uuid := 'a0000000-0000-4000-8000-000000000003'; u_sophie uuid := 'a0000000-0000-4000-8000-000000000004';
  u_ana    uuid := 'a0000000-0000-4000-8000-000000000005';
  harper uuid := 'f0000000-0000-4000-8000-000000000001'; patel uuid := 'f0000000-0000-4000-8000-000000000002';
  sophie_h uuid := 'b0000000-0000-4000-8000-000000000001'; ana_h uuid := 'b0000000-0000-4000-8000-000000000002';
  sophie_p uuid := 'b0000000-0000-4000-8000-000000000003';
  mia uuid := 'd0000000-0000-4000-8000-000000000001'; leo uuid := 'd0000000-0000-4000-8000-000000000002';
  arjun uuid := 'd0000000-0000-4000-8000-000000000003';
  thr_h uuid := 'e0000000-0000-4000-8000-000000000001'; thr_p uuid := 'e0000000-0000-4000-8000-000000000002';
  today date := current_date;
begin
  if exists (select 1 from public.families where slug not like 'demo-%') then
    raise exception 'Refused: this database holds real households. Made-up households go on the test copy only.';
  end if;
  if exists (select 1 from public.families where slug like 'demo-%') then
    raise exception 'The made-up households are already loaded.';
  end if;

  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (u_olivia, 'olivia.harper@test.invalid', 'authenticated', 'authenticated', now()),
    (u_james,  'james.harper@test.invalid',  'authenticated', 'authenticated', now()),
    (u_priya,  'priya.patel@test.invalid',   'authenticated', 'authenticated', now()),
    (u_sophie, 'sophie.clarke@test.invalid', 'authenticated', 'authenticated', now()),
    (u_ana,    'ana.ruiz@test.invalid',      'authenticated', 'authenticated', now());
  -- What the sign-in service expects of a hand-made user: empty (not missing) tokens and an email identity.
  -- The test-only password is set separately from the app's git-ignored .env.local, never stored here.
  update auth.users set instance_id = '00000000-0000-0000-0000-000000000000', confirmation_token = '', recovery_token = '',
    email_change_token_new = '', email_change = '', email_change_token_current = '', phone_change = '',
    phone_change_token = '', reauthentication_token = '', created_at = now(), updated_at = now(), raw_app_meta_data = '{"provider": "email", "providers": ["email"]}',
    raw_user_meta_data = '{}' where email like '%@test.invalid';
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
    from auth.users where email like '%@test.invalid';
  insert into public.people (id, user_id, display_name) values
    ('c0000000-0000-4000-8000-000000000001', u_olivia, 'Olivia Harper'),
    ('c0000000-0000-4000-8000-000000000002', u_james,  'James Harper'),
    ('c0000000-0000-4000-8000-000000000003', u_priya,  'Priya Patel'),
    ('c0000000-0000-4000-8000-000000000004', u_sophie, 'Sophie Clarke'),
    ('c0000000-0000-4000-8000-000000000005', u_ana,    'Ana Ruiz');

  insert into public.families (id, slug, family_name, access_code_hash, start_date) values
    (harper, 'demo-harper', 'The Harpers', 'not-a-real-code', today - 120),
    (patel,  'demo-patel',  'The Patels',  'not-a-real-code', today - 45);
  insert into public.family_nannies (id, family_id, name, role, bio, sort_order) values
    (sophie_h, harper, 'Sophie Clarke', 'nanny', 'Nanny for eight years; loves forest school and baking.', 0),
    (ana_h,    harper, 'Ana Ruiz', 'au_pair', 'Au pair from Valencia, here for the year.', 1),
    (sophie_p, patel,  'Sophie Clarke', 'nanny', 'After-school care, Monday to Wednesday.', 0);
  insert into public.household_members (family_id, person_id, role, nanny_id) values
    (harper, 'c0000000-0000-4000-8000-000000000001', 'owner', null),
    (harper, 'c0000000-0000-4000-8000-000000000002', 'co_parent', null),
    (harper, 'c0000000-0000-4000-8000-000000000004', 'staff', sophie_h),
    (harper, 'c0000000-0000-4000-8000-000000000005', 'staff', ana_h),
    (patel,  'c0000000-0000-4000-8000-000000000003', 'owner', null),
    (patel,  'c0000000-0000-4000-8000-000000000004', 'staff', sophie_p);

  -- Household information.
  insert into public.family_profile (family_id, home_address, house_rules, gp_details, medical_notes, emergency_instructions) values
    (harper, '12 Example Road, London', 'Shoes off inside. Screens only after tea.', 'Example Surgery, 020 7946 0000', 'Mia: peanut allergy, auto-injector in the kitchen drawer.', 'Call 999 first, then Olivia.'),
    (patel,  '4 Sample Close, London', 'Homework before play.', 'Sample Health Centre, 020 7946 0001', 'None known.', 'Call 999 first, then Priya.');
  insert into public.family_children (id, family_id, name, date_of_birth, school, allergies, medication, bedtime_routine, sort_order) values
    (mia,   harper, 'Mia',   today - 4 * 365, 'Example Nursery', 'Peanuts (severe)', 'Auto-injector if needed', 'Bath, two stories, lights out 7pm', 0),
    (leo,   harper, 'Leo',   today - 548,     null,              null,               null, 'Bottle, sleeping bag, 6:30pm', 1),
    (arjun, patel,  'Arjun', today - 7 * 365, 'Sample Primary, Year 3', null, null, 'Reading, lights out 8pm', 0);
  insert into public.family_contacts (family_id, name, relationship, phone, sort_order) values
    (harper, 'Olivia Harper', 'Mum', '07700 900001', 0), (harper, 'James Harper', 'Dad', '07700 900002', 1),
    (harper, 'Margaret Harper', 'Grandma', '07700 900003', 2),
    (patel,  'Priya Patel', 'Mum', '07700 900004', 0), (patel, 'Raj Patel', 'Uncle', '07700 900005', 1);
  insert into public.house_manual_entries (family_id, category, title, notes) values
    (harper, 'rules', 'Bins', 'Black bin Tuesday night, recycling Friday.'),
    (patel,  'appliances', 'Heating', 'Thermostat in the hall; 20 degrees.');

  -- Today and yesterday at the Harpers (Sophie's shift), and an afternoon at the Patels.
  insert into public.care_events (family_id, child_id, kind, started_at, ended_at, amount_ml, detail, added_by, created_by) values
    (harper, leo, 'bottle', today + time '07:30', null, 180, null, 'family', u_olivia),
    (harper, leo, 'nap',    today + time '09:45', today + time '11:00', null, 'Settled quickly', 'nanny', u_sophie),
    (harper, mia, 'meal',   today + time '12:15', null, null, 'Pasta and peas, ate it all', 'nanny', u_sophie),
    (harper, leo, 'nappy',  today + time '12:40', null, null, 'Wet', 'nanny', u_sophie),
    (harper, mia, 'potty',  today + time '13:10', null, null, 'Dry all morning', 'nanny', u_sophie),
    (harper, leo, 'nap',    today - 1 + time '13:00', today - 1 + time '14:30', null, null, 'nanny', u_sophie),
    (patel,  arjun, 'meal', today + time '15:45', null, null, 'Toast and fruit after school', 'nanny', u_sophie);
  insert into public.daily_logs (family_id, log_date, activities, food, mood, notes, tomorrow, created_by) values
    (harper, today - 1, 'Park and library rhyme time', 'Good lunch, small tea', 'Happy, a bit tired', 'Mia counted to 20!', 'Nursery drop-off at 8:45', u_sophie),
    (patel,  today - 1, 'Spelling practice, football', 'Ate well', 'Chatty', null, 'Swimming kit needed', u_sophie);
  insert into public.medication_doses (family_id, child_name, medicine, dose, given_at, given_by, given_by_name, reason, created_by) values
    (harper, 'Leo', 'Infant paracetamol', '2.5 ml', today - 1 + time '16:00', 'nanny', 'Sophie Clarke', 'Teething, slight temperature', u_sophie);
  insert into public.family_moments (family_id, nanny_id, child_id, kind, moment_date, caption, milestone_label, added_by, added_by_name, created_by) values
    (harper, sophie_h, mia, 'milestone', today - 1, 'Counted all the way to 20 at the park', 'Counting', 'nanny', 'Sophie Clarke', u_sophie);

  -- Calendar: a nursery run, a swimming lesson, and a shift change waiting for a parent.
  insert into public.planner_entries (family_id, entry_date, time_label, title, child_name, entry_type, added_by, approval) values
    (harper, today + 1, '08:45', 'Nursery drop-off', 'Mia', 'note', 'family', 'approved'),
    (harper, today + 2, '10:00', 'Baby swimming', 'Leo', 'note', 'family', 'approved'),
    (harper, today + 3, '15:00', 'Sophie to finish at 15:00 (dentist)', null, 'shift_change', 'nanny', 'pending'),
    (patel,  today + 1, '16:30', 'Swimming lesson', 'Arjun', 'note', 'family', 'approved');

  -- Regular hours: Sophie full days at the Harpers, Ana a split shift, Sophie after school at the Patels.
  insert into public.nanny_work_hours (family_id, nanny_id, working_days) values
    (harper, sophie_h, (select jsonb_agg(jsonb_build_object('day', d, 'enabled', true, 'startTime', '08:00', 'endTime', '18:00'))
      from unnest(array['Monday','Tuesday','Wednesday','Thursday','Friday']) d)),
    (harper, ana_h, (select jsonb_agg(jsonb_build_object('day', d, 'enabled', true, 'startTime', '07:00', 'endTime', '09:00', 'startTime2', '15:00', 'endTime2', '19:00'))
      from unnest(array['Monday','Tuesday','Wednesday','Thursday','Friday']) d)),
    (patel, sophie_p, (select jsonb_agg(jsonb_build_object('day', d, 'enabled', true, 'startTime', '15:00', 'endTime', '18:30'))
      from unnest(array['Monday','Tuesday','Wednesday']) d));

  -- Messages.
  insert into public.household_threads (id, family_id, title, created_by, last_sender, family_unread) values
    (thr_h, harper, 'This week', 'family', 'nanny', true),
    (thr_p, patel,  'Pick-up times', 'family', 'family', false);
  insert into public.household_messages (thread_id, sender, sender_name, body, created_at) values
    (thr_h, 'family', 'Olivia Harper', 'Grandma is collecting Mia on Thursday.', now() - interval '3 hours'),
    (thr_h, 'nanny',  'Sophie Clarke', 'Lovely, I will pack her bag.', now() - interval '2 hours'),
    (thr_p, 'family', 'Priya Patel', 'I will be home by 6 today.', now() - interval '1 day');

  -- Pay: each staff member sees only their own (decision 2).
  insert into public.timesheet_shifts (family_id, nanny_id, shift_date, start_time, end_time, hourly_rate, submitted_by, status) values
    (harper, sophie_h, today - 1, '08:00', '18:00', 16.00, 'nanny', 'approved'),
    (harper, sophie_h, today,     '08:00', '18:00', 16.00, 'nanny', 'pending'),
    (harper, ana_h,    today - 1, '07:00', '09:00', 0, 'nanny', 'approved'),
    (patel,  sophie_p, today - 1, '15:15', '18:30', 17.50, 'nanny', 'approved');
end $$;
