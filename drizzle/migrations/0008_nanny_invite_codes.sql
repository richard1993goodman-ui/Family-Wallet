ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS nanny_code text,
  ADD COLUMN IF NOT EXISTS nanny_code_hash text,
  ADD COLUMN IF NOT EXISTS nanny_invited_at timestamptz;