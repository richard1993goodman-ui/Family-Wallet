-- When an agency emailed a family its wallet link and access code, so the household list can show "Invite sent".
ALTER TABLE public.families ADD COLUMN invite_sent_at timestamptz;
