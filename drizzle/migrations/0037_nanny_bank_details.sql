CREATE TABLE public.nanny_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nanny_id uuid NOT NULL REFERENCES public.family_nannies(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  bank_name text,
  sort_code text,
  account_number text,
  iban text,
  swift text,
  payment_reference text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, nanny_id)
);
GRANT ALL ON public.nanny_bank_details TO service_role;
ALTER TABLE public.nanny_bank_details ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.nanny_bank_details IS 'Nanny-owned payment details; server-only access via wallet session, no client policies.';