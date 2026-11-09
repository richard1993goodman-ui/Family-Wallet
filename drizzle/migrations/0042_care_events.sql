-- Quick-tap care log: naps, bottles, meals, nappies and potty. Server-side access only, like the other wallet tables.
CREATE TABLE public.care_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.family_children(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('nap','bottle','meal','nappy','potty')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  amount_ml integer CHECK (amount_ml IS NULL OR (amount_ml > 0 AND amount_ml <= 1000)),
  detail text,
  added_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_events TO authenticated;
GRANT ALL ON public.care_events TO service_role;
ALTER TABLE public.care_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage care events"
ON public.care_events FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX care_events_family_time_idx ON public.care_events(family_id, started_at DESC);
