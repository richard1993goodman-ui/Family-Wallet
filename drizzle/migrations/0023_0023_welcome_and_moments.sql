CREATE TABLE public.family_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nanny_id uuid REFERENCES public.family_nannies(id) ON DELETE SET NULL,
  child_id uuid REFERENCES public.family_children(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'photo' CHECK (kind IN ('photo', 'milestone')),
  moment_date date NOT NULL,
  caption text,
  milestone_label text,
  storage_path text,
  added_by text NOT NULL,
  added_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_moments TO authenticated;
GRANT ALL ON public.family_moments TO service_role;
ALTER TABLE public.family_moments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage family moments"
ON public.family_moments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX family_moments_family_date_idx ON public.family_moments(family_id, moment_date DESC);

CREATE TABLE public.welcome_progress (
  family_id uuid PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
  steps jsonb NOT NULL DEFAULT '{}'::jsonb,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.welcome_progress TO authenticated;
GRANT ALL ON public.welcome_progress TO service_role;
ALTER TABLE public.welcome_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage welcome progress"
ON public.welcome_progress FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sample milestone entries for the demo wallet (photos are not seeded; milestones only).
DO $$
DECLARE fid uuid;
BEGIN
  SELECT id INTO fid FROM public.families WHERE slug = 'demo';
  IF fid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.family_moments WHERE family_id = fid) THEN RETURN; END IF;

  INSERT INTO public.family_moments (family_id, child_id, kind, moment_date, caption, milestone_label, added_by, added_by_name)
  SELECT f.id, c.id, 'milestone', current_date - 1, 'Ten keepy-uppies in a row before tea — new personal best!', 'Football milestone', 'nanny', 'Jess Carter'
  FROM public.families f JOIN public.family_children c ON c.family_id = f.id AND c.name = 'Oscar'
  WHERE f.slug = 'demo';

  INSERT INTO public.family_moments (family_id, child_id, kind, moment_date, caption, milestone_label, added_by, added_by_name)
  SELECT f.id, c.id, 'milestone', current_date - 4, 'Rode the whole hill on his scooter without stopping once.', 'Scooter milestone', 'family', 'Emma Harrington'
  FROM public.families f JOIN public.family_children c ON c.family_id = f.id AND c.name = 'Leo'
  WHERE f.slug = 'demo';

  INSERT INTO public.family_moments (family_id, child_id, kind, moment_date, caption, milestone_label, added_by, added_by_name)
  SELECT f.id, NULL, 'milestone', current_date - 2, 'One blanket, two boys, zero rain — den building at its finest.', 'Team effort', 'nanny', 'Jess Carter'
  FROM public.families f WHERE f.slug = 'demo';
END $$;
