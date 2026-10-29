ALTER TABLE public.partner_agencies
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS intro_pricing boolean NOT NULL DEFAULT false;