-- A family can choose not to use the wallet's nanny agreement, and an agency can turn it off for all its families.
-- Without an agreement, parents enter each nanny's working hours by hand; those feed the week and leave counts.
ALTER TABLE public.families ADD COLUMN use_agreement boolean NOT NULL DEFAULT true;
ALTER TABLE public.partner_agencies ADD COLUMN agreements_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE public.nanny_work_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nanny_id uuid NOT NULL UNIQUE REFERENCES public.family_nannies(id) ON DELETE CASCADE,
  working_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nanny_work_hours_family_idx ON public.nanny_work_hours(family_id);
GRANT ALL ON public.nanny_work_hours TO service_role;
ALTER TABLE public.nanny_work_hours ENABLE ROW LEVEL SECURITY;
