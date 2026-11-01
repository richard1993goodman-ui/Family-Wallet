CREATE TABLE public.travel_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  accommodation text,
  local_emergency text,
  nearest_hospital text,
  time_difference text,
  travel_pay text,
  notes text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  handover_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX travel_trips_family_idx ON public.travel_trips(family_id, start_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_trips TO authenticated;
GRANT ALL ON public.travel_trips TO service_role;
ALTER TABLE public.travel_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage travel trips" ON public.travel_trips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));