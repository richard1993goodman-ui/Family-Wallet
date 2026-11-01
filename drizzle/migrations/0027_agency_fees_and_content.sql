ALTER TABLE public.families ADD COLUMN IF NOT EXISTS fee_label text, ADD COLUMN IF NOT EXISTS fee_amount text;
ALTER TABLE public.partner_agencies
  ADD COLUMN IF NOT EXISTS allow_challenges boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_perks boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_playbooks boolean NOT NULL DEFAULT false;
ALTER TABLE public.agency_challenges ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.partner_agencies(id) ON DELETE CASCADE;
ALTER TABLE public.partner_perks ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.partner_agencies(id) ON DELETE CASCADE;
ALTER TABLE public.seasonal_playbooks ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.partner_agencies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS agency_challenges_agency_idx ON public.agency_challenges(agency_id);
CREATE INDEX IF NOT EXISTS partner_perks_agency_idx ON public.partner_perks(agency_id);
CREATE INDEX IF NOT EXISTS seasonal_playbooks_agency_idx ON public.seasonal_playbooks(agency_id);