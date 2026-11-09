-- An agency (or the owner, for their own families) can set the nanny agreement on or off for chosen families.
-- 'family' = the parents decide (default). 'on' / 'off' = set by the agency and locked for the family.
ALTER TABLE public.families
  ADD COLUMN agreement_policy text NOT NULL DEFAULT 'family' CHECK (agreement_policy IN ('family','on','off'));
