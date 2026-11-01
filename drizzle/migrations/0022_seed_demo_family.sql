DO $$
DECLARE fid uuid; nid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.families WHERE slug = 'demo') THEN RETURN; END IF;

  INSERT INTO public.families (slug, family_name, contact_email, tier_band, nanny_name, start_date, terms_accepted_on, notes, access_code, access_code_hash, status)
  VALUES ('demo', 'The Harrington Family (Demo)', 'demo@athletemannies.co.uk', '5', 'Jess Carter', current_date - 120, current_date - 125,
          'Demo wallet for prospective families.', 'DEMO', 'demo-only-no-code-login', 'active')
  RETURNING id INTO fid;

  INSERT INTO public.family_nannies (family_id, name, bio, emergency_name, emergency_relationship, emergency_phone, insurance_provider, insurance_cover_from, insurance_cover_until)
  VALUES (fid, 'Jess Carter', 'Former county netball player and qualified PE coach. Five years of after-school care, Paediatric First Aid certified, loves getting kids outdoors.',
          'Sarah Carter', 'Mother', '07700 900123', 'Morton Michel', current_date - 100, current_date + 265)
  RETURNING id INTO nid;

  INSERT INTO public.family_children (family_id, name, date_of_birth, school, year_group, school_hours, allergies, personality, interests, dislikes, bedtime_routine, what_makes_them_tick, sort_order) VALUES
  (fid, 'Oscar', current_date - interval '8 years 3 months', 'St Mary''s Primary', 'Year 4', '8:45am – 3:15pm', 'None', 'Energetic, competitive, kind', 'Football, Lego, dinosaurs', 'Mushrooms', 'Bath 7pm, reading, lights out 7:45pm', 'A challenge and a high five', 0),
  (fid, 'Leo', current_date - interval '5 years 2 months', 'St Mary''s Primary', 'Reception', '8:45am – 3:00pm', 'Mild nut allergy — Piriton in kitchen drawer', 'Cheeky, creative, a little shy at first', 'Drawing, scooters, swimming', 'Loud hand dryers', 'Bath 6:45pm, two stories, lights out 7:15pm', 'Praise for trying something new', 1);

  INSERT INTO public.family_contacts (family_id, name, relationship, phone, sort_order) VALUES
  (fid, 'Emma Harrington', 'Mum', '07700 900456', 0),
  (fid, 'Tom Harrington', 'Dad', '07700 900789', 1),
  (fid, 'Granny Pat', 'Grandmother', '07700 900321', 2);

  INSERT INTO public.family_profile (family_id, home_address, house_rules, screen_time_rules, homework_expectations, gp_details, emergency_instructions) VALUES
  (fid, '12 Example Gardens, London W10', 'Shoes off at the door. Snacks at the table. Kindness first.', '30 minutes after homework, none after 6:30pm.', 'Reading every day, spellings Mon/Wed.', 'Ladbroke Grove Surgery — 020 7946 0000', 'Call 999 first, then Emma, then Tom.');

  INSERT INTO public.nanny_agreements (family_id, nanny_id, employer_names, nanny_name, start_date, status, version, issued_at, agreement_data) VALUES
  (fid, nid, 'Emma & Tom Harrington', 'Jess Carter', current_date - 120, 'issued', 1, now() - interval '118 days',
   jsonb_build_object(
     'documentStyle', 'statement',
     'employerNames', 'Emma & Tom Harrington',
     'nannyName', 'Jess Carter',
     'startDate', to_char(current_date - 120, 'YYYY-MM-DD'),
     'hourlyRate', '18',
     'rateBasis', 'gross',
     'workingDays', jsonb_build_array(
       jsonb_build_object('day','Monday','enabled',true,'startTime','15:00','endTime','19:30'),
       jsonb_build_object('day','Tuesday','enabled',true,'startTime','15:00','endTime','19:30'),
       jsonb_build_object('day','Wednesday','enabled',true,'startTime','15:00','endTime','19:30'),
       jsonb_build_object('day','Thursday','enabled',true,'startTime','15:00','endTime','19:30'),
       jsonb_build_object('day','Friday','enabled',true,'startTime','15:00','endTime','19:30'),
       jsonb_build_object('day','Saturday','enabled',false,'startTime','09:00','endTime','17:00'),
       jsonb_build_object('day','Sunday','enabled',false,'startTime','09:00','endTime','17:00')),
     'statementBody', E'This written statement confirms that Jess Carter will work as an after-school nanny for Emma and Tom Harrington from Monday to Friday, 3:00pm to 7:30pm, during term time.\n\nJess will collect Oscar and Leo from school, provide a healthy snack and dinner, support homework and reading, and lead active outdoor play.\n\nPay is £18 per hour gross, paid monthly by bank transfer. Either party may give four weeks'' notice.'
   ));

  INSERT INTO public.document_signatures (family_id, nanny_id, doc_kind, signer_role, signer_name, doc_version) VALUES
  (fid, NULL, 'agreement', 'family', 'Emma Harrington', '1'),
  (fid, nid, 'agreement', 'nanny', 'Jess Carter', '1');

  INSERT INTO public.planner_entries (family_id, entry_date, time_label, end_time_label, title, child_name, entry_type, added_by) VALUES
  (fid, current_date, '16:00', '17:00', 'Football training at the park', 'Oscar', 'activity', 'family'),
  (fid, current_date, NULL, NULL, 'Leo has a playdate invite from Maya — reply by Friday', 'Leo', 'note', 'nanny'),
  (fid, current_date + 1, '15:30', '16:15', 'Swimming lesson', 'Leo', 'activity', 'family'),
  (fid, current_date + 2, NULL, NULL, 'Spaghetti bolognese night', NULL, 'meal', 'nanny'),
  (fid, current_date + 4, NULL, NULL, 'Inset day — school closed', NULL, 'inset_day', 'family');

  INSERT INTO public.daily_logs (family_id, log_date, activities, food, homework, mood, notes, tomorrow) VALUES
  (fid, current_date - 1, 'Scooter race in the park, then Lego build-off', 'Chicken wraps, fruit salad', 'Oscar spellings done, Leo read 2 books', 'Great — lots of laughs', 'Leo was brave at the dentist this morning!', 'PE kit for Oscar'),
  (fid, current_date - 2, 'Football drills and den building', 'Fish pie, peas', 'Maths sheet done', 'Tired but happy', NULL, 'Library books back');

  INSERT INTO public.sports_passport_entries (family_id, child_name, activity, skill_area, confidence_level, effort_level, minutes, badge, notes, logged_by, logged_by_name, entry_date) VALUES
  (fid, 'Oscar', 'Football', 'Ball control', 4, 5, 45, 'Dribble Master', 'Ten keepy-uppies in a row!', 'nanny', 'Jess Carter', current_date - 1),
  (fid, 'Leo', 'Scooter', 'Balance', 3, 4, 30, 'First Big Hill', 'Rode down the hill without stopping', 'nanny', 'Jess Carter', current_date - 2),
  (fid, 'Leo', 'Swimming', 'Water confidence', 3, 5, 30, NULL, 'Put face in the water for the first time', 'family', 'Emma Harrington', current_date - 5);

  INSERT INTO public.handover_checklists (family_id, nanny_id, handover_date, homework_status, dinner_status, water_status, mood, energy, school_bag_ready, pe_kit_ready, reading_done, tomorrow_notes, submitted_by, submitted_by_name) VALUES
  (fid, nid, current_date - 1, 'done', 'ate_well', 'good', 'happy', 'medium', true, true, true, 'Oscar needs PE kit, Leo has show and tell', 'nanny', 'Jess Carter');

  INSERT INTO public.support_threads (family_id, subject, status, last_sender, family_unread) VALUES
  (fid, 'Welcome to your Family Vault', 'open', 'agency', true);
  INSERT INTO public.support_messages (thread_id, sender, body)
  SELECT id, 'agency', 'Hi Emma — welcome! Everything for Jess and the boys lives here. Message us any time.' FROM public.support_threads WHERE family_id = fid;
END $$;