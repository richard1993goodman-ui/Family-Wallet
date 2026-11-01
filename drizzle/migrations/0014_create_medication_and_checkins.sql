CREATE TABLE public.medication_doses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  medicine TEXT NOT NULL,
  dose TEXT,
  given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  given_by TEXT NOT NULL DEFAULT 'family',
  given_by_name TEXT,
  next_dose_from TIMESTAMPTZ,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX medication_doses_family_given_idx ON public.medication_doses (family_id, given_at DESC);

GRANT ALL ON public.medication_doses TO service_role;

ALTER TABLE public.medication_doses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage medication doses"
ON public.medication_doses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.review_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nanny_id UUID REFERENCES public.family_nannies(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'six_month',
  status TEXT NOT NULL DEFAULT 'draft',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  author TEXT NOT NULL DEFAULT 'family',
  call_requested BOOLEAN NOT NULL DEFAULT false,
  thread_id UUID REFERENCES public.support_threads(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX review_checkins_family_idx ON public.review_checkins (family_id, created_at DESC);

GRANT ALL ON public.review_checkins TO service_role;

ALTER TABLE public.review_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage review checkins"
ON public.review_checkins
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));