CREATE TABLE public.live_in_settings (
  family_id uuid PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
  weekly_pocket_money numeric(8,2) NOT NULL DEFAULT 0,
  max_weekly_hours numeric(5,2) NOT NULL DEFAULT 30,
  days_off_per_week integer NOT NULL DEFAULT 2,
  room_and_board text,
  house_rules text,
  study_schedule text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.live_in_settings TO service_role;
ALTER TABLE public.live_in_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.live_in_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  hours_worked numeric(5,2) NOT NULL DEFAULT 0,
  days_off integer NOT NULL DEFAULT 0,
  pocket_money_paid boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, week_start)
);
GRANT ALL ON public.live_in_weeks TO service_role;
ALTER TABLE public.live_in_weeks ENABLE ROW LEVEL SECURITY;

INSERT INTO public.live_in_settings (family_id, weekly_pocket_money, max_weekly_hours, days_off_per_week, room_and_board, house_rules, study_schedule)
SELECT id, 110, 30, 2, 'Own double room on the top floor with shared bathroom. All meals included; family dinner most evenings.', 'Quiet after 10:30pm on weeknights. Friends welcome in the kitchen and garden; please let us know before overnight guests.', 'English class Tuesday and Thursday 10am–12pm (protected time).'
FROM public.families WHERE slug = 'demo' ON CONFLICT DO NOTHING;

INSERT INTO public.live_in_weeks (family_id, week_start, hours_worked, days_off, pocket_money_paid, note)
SELECT f.id, (date_trunc('week', now())::date - v.wk * 7), v.h, 2, v.wk > 0, v.n
FROM public.families f
CROSS JOIN (VALUES (0, 18::numeric, 'Week in progress'), (1, 28::numeric, 'Extra evening for parents'' dinner'), (2, 26::numeric, NULL)) AS v(wk, h, n)
WHERE f.slug = 'demo' ON CONFLICT DO NOTHING;