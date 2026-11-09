ALTER TABLE public.families
  ADD COLUMN agreement_policy text NOT NULL DEFAULT 'family' CHECK (agreement_policy IN ('family','on','off'));