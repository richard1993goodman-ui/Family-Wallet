CREATE TABLE public.kids_playbook_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
 category text NOT NULL CHECK (category IN ('comfort','handle','friends','activities')),
 child_name text NOT NULL DEFAULT '' CHECK (char_length(child_name) <= 60),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
 notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 4000),
 added_by text NOT NULL DEFAULT 'family' CHECK (added_by IN ('family','nanny')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.kids_playbook_entries TO service_role;
ALTER TABLE public.kids_playbook_entries ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.kids_playbook_entries IS 'Kids playbook. Service-role only; server functions verify the family link-and-code session.';
CREATE INDEX kids_playbook_family ON public.kids_playbook_entries(family_id, category);
INSERT INTO public.kids_playbook_entries (family_id, category, child_name, title, notes, added_by)
SELECT f.id, v.c, v.child, v.t, v.n, v.by FROM public.families f,
(VALUES ('comfort','Oliver','Calms down with','Five minutes of quiet reading on the beanbag, then a hug.','family'),
 ('comfort','Oliver','Current obsession','Dinosaurs — ask him about the T-rex vs Spinosaurus debate!','family'),
 ('comfort','Mia','Sensitivities','Hates loud blenders and clothing tags. Scared of big dogs on walks.','family'),
 ('handle','','Big emotions','We name the feeling first, then hold the boundary. Calm step for 3 minutes if needed.','family'),
 ('handle','','Screens','30 minutes after homework only. No YouTube before dinner.','family'),
 ('handle','','Rewards','Star chart on the fridge — 10 stars = Saturday treat.','family'),
 ('friends','Oliver','Leo (Year 3)','Mum: Sarah. Can take Oliver home after football on Thursdays.','family'),
 ('activities','','Rainy day den','Blankets are in the hall cupboard. Kids love a den + torch story time.','nanny'),
 ('activities','','Local favourite','Library story hour Saturdays 10:30. Park café does babyccinos.','nanny')) AS v(c, child, t, n, by)
WHERE f.slug = 'demo';