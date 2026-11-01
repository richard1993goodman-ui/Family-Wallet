CREATE TABLE public.family_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL UNIQUE REFERENCES public.families(id) ON DELETE CASCADE,
  payroll_status text NOT NULL DEFAULT 'not_started' CHECK (payroll_status IN ('not_started', 'details_needed', 'introduction_requested', 'setup_in_progress', 'payroll_ready')),
  payroll_start_date date,
  payroll_notes text,
  curation_status text NOT NULL DEFAULT 'not_started' CHECK (curation_status IN ('not_started', 'brief_received', 'search_underway', 'shortlist_sent', 'interviews', 'placement_made', 'paused')),
  curation_notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_services TO authenticated;
GRANT ALL ON public.family_services TO service_role;
ALTER TABLE public.family_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage family services"
ON public.family_services
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.family_nannies
  ADD COLUMN insurance_provider text,
  ADD COLUMN insurance_policy_number text,
  ADD COLUMN insurance_cover_from date,
  ADD COLUMN insurance_cover_until date;

CREATE INDEX family_services_family_id_idx ON public.family_services(family_id);