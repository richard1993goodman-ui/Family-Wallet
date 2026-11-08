INSERT INTO public.house_manual_entries (family_id, category, title, notes, secret_value)
SELECT f.id, v.category, v.title, v.notes, v.secret
FROM public.families f
CROSS JOIN (VALUES
  ('access', 'Front door key safe', 'Grey box to the left of the porch, behind the lavender pot. Please scramble the dial after use.', '4821'),
  ('access', 'Home WiFi', 'Network: Harrington_Home. The guest network works for visitors too.', 'Sunflower-Kettle-27'),
  ('access', 'House alarm', 'Panel is inside the hallway cupboard. You have 30 seconds after opening the door.', '1964'),
  ('access', 'Side gate', 'Bolt at the top sticks a little in wet weather - lift and push.', NULL),
  ('emergencies', 'Stopcock and fuse box', 'Stopcock is under the kitchen sink behind the bin. Fuse box is in the understairs cupboard, torch on the shelf above.', NULL),
  ('emergencies', 'Neighbour with spare key', 'Margaret at No. 14 (blue door) is home most days and happy to help.', NULL),
  ('rules', 'Screen time', 'Weekdays: 30 minutes after homework, none before school. Fridays are film night.', NULL),
  ('rules', 'Snacks', 'Fruit, crackers and cheese any time. Biscuits only after dinner. Nut-free house.', NULL),
  ('rules', 'Bedtime', 'Leo 7:00pm, Olivia 7:30pm. Two stories each, lights off by half past.', NULL),
  ('appliances', 'Dishwasher', 'Eco cycle overnight. Tablets are in the cupboard to the right of the sink.', NULL),
  ('appliances', 'Heating', 'Thermostat in the hallway. Please keep it at 19°C - boost for 1 hour if the kids are cold.', NULL),
  ('appliances', 'Bin day', 'Thursday morning. Green bin one week, black bin the next - the calendar is on the fridge.', NULL)
) AS v(category, title, notes, secret)
WHERE f.slug = 'demo'
  AND NOT EXISTS (SELECT 1 FROM public.house_manual_entries h WHERE h.family_id = f.id);

INSERT INTO public.travel_trips (family_id, destination, start_date, end_date, accommodation, local_emergency, nearest_hospital, time_difference, travel_pay, notes, checklist)
SELECT f.id, 'Cornwall - St Ives', current_date + 21, current_date + 27,
  'Seagull Cottage, 3 Porthminster Terrace. Parking permit is in the glovebox.',
  '999 (UK). Coastguard: 999 and ask for the Coastguard.',
  'West Cornwall Hospital, Penzance - 20 minutes by car.',
  'None - UK time',
  'Usual daily rate plus £20 travel day supplement. Meals covered by the family.',
  'Beach mornings, quiet time after lunch. Suncream reapplied every two hours.',
  '[{"id":"d1","label":"Passports / ID","done":true},{"id":"d2","label":"Medication","done":true},{"id":"d3","label":"Suncream and hats","done":false},{"id":"d4","label":"Car seats","done":false},{"id":"d5","label":"Favourite comforters","done":false}]'::jsonb
FROM public.families f
WHERE f.slug = 'demo'
  AND NOT EXISTS (SELECT 1 FROM public.travel_trips t WHERE t.family_id = f.id);