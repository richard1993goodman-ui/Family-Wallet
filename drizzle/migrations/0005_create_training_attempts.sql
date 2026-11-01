CREATE TABLE public.training_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  learner_name text NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  certificate_ref text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX training_attempts_family_idx ON public.training_attempts (family_id, completed_at DESC);
CREATE UNIQUE INDEX training_attempts_ref_idx ON public.training_attempts (certificate_ref);

GRANT ALL ON public.training_attempts TO service_role;
GRANT SELECT ON public.training_attempts TO authenticated;

ALTER TABLE public.training_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage training attempts"
ON public.training_attempts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
