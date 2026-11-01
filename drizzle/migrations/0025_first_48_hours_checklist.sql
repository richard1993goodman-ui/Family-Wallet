CREATE TABLE public.welcome_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nanny_id uuid NOT NULL REFERENCES public.family_nannies(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  confirmed_by text NOT NULL CHECK (confirmed_by IN ('family', 'nanny')),
  confirmed_at timestamptz,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, nanny_id, step_id, confirmed_by)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.welcome_checkins TO authenticated;
GRANT ALL ON public.welcome_checkins TO service_role;
ALTER TABLE public.welcome_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage first 48 hours checkins" ON public.welcome_checkins FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX welcome_checkins_family_nanny_idx ON public.welcome_checkins(family_id, nanny_id);