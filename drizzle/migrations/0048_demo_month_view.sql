-- Demo wallet: hours, daily updates and parent notes for the home month view.
-- shortcut: dated from the day this runs (five weeks back, two ahead), so the demo month thins out
-- after that; every insert skips days that already have a row, so re-run this file to top it up.
WITH demo AS (SELECT id FROM public.families WHERE slug = 'demo'),
days AS (
  SELECT d::date AS day, extract(isodow FROM d)::int AS dow
  FROM generate_series(current_date - 35, current_date + 14, interval '1 day') AS d
),
shifts AS (
  INSERT INTO public.timesheet_shifts (family_id, shift_date, start_time, end_time, hourly_rate, status, reviewed_at)
  SELECT demo.id, days.day, '15:00', CASE WHEN days.dow = 3 THEN '19:45' ELSE '19:30' END, 18,
         CASE WHEN days.day = current_date - 1 THEN 'pending' ELSE 'approved' END,
         CASE WHEN days.day = current_date - 1 THEN NULL ELSE now() END
  FROM demo, days
  WHERE days.dow <= 5 AND days.day < current_date
    AND NOT EXISTS (SELECT 1 FROM public.timesheet_shifts s WHERE s.family_id = demo.id AND s.shift_date = days.day)
),
logs AS (
  INSERT INTO public.daily_logs (family_id, log_date, activities, food, homework, mood, notes, tomorrow)
  SELECT demo.id, days.day, v.activities, v.food, v.homework, v.mood, v.notes, v.tomorrow
  FROM demo, days
  JOIN (VALUES
    (1, 'Football in the park, then a Lego build-off', 'Chicken wraps, fruit salad', 'Oscar spellings done, Leo read 2 books', 'Great — lots of laughs', 'Leo asked to stay out longer. A good sign!', 'PE kit for Oscar'),
    (2, 'Scooters to the library and back', 'Fish pie, peas', 'Maths sheet done', 'Calm and chatty', NULL, 'Library books back'),
    (3, 'Baking flapjacks, then den building', 'Jacket potatoes, beans', 'Reading, 15 minutes each', 'Tired but happy', 'Oscar helped Leo with his letters.', NULL),
    (4, 'Swimming lesson, then drawing at home', 'Pasta with tomato sauce', 'Spellings practised twice', 'Proud', 'Leo put his face in the water.', 'Show and tell for Leo'),
    (5, 'Garden obstacle course and film night', 'Homemade pizza', 'None on Fridays', 'Giggly', NULL, 'Football boots for Saturday')
  ) AS v(dow, activities, food, homework, mood, notes, tomorrow) ON v.dow = days.dow
  WHERE days.day < current_date
    AND NOT EXISTS (SELECT 1 FROM public.daily_logs l WHERE l.family_id = demo.id AND l.log_date = days.day)
)
INSERT INTO public.planner_entries (family_id, entry_date, time_label, title, child_name, entry_type, added_by, notes)
SELECT demo.id, days.day, v.time_label, v.title, v.child_name, 'note', 'family', v.notes
FROM demo, days
JOIN (VALUES
  (1, NULL, 'Spellings test on Friday', 'Oscar', 'The list is on the fridge. Ten minutes after snack works best.'),
  (4, '16:30', 'Swimming kit is in the hall cupboard', 'Leo', 'Goggles are in the side pocket of the blue bag.'),
  (5, NULL, 'Film night — popcorn is in the top cupboard', NULL, NULL)
) AS v(dow, time_label, title, child_name, notes) ON v.dow = days.dow
WHERE NOT EXISTS (
  SELECT 1 FROM public.planner_entries p
  WHERE p.family_id = demo.id AND p.entry_date = days.day AND p.added_by = 'family'
);
