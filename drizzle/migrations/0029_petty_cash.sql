CREATE TABLE public.petty_cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('topup', 'spend')),
  entry_date date NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  added_by text NOT NULL,
  added_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.petty_cash_entries TO authenticated;
GRANT ALL ON public.petty_cash_entries TO service_role;
ALTER TABLE public.petty_cash_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage petty cash"
ON public.petty_cash_entries FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX petty_cash_family_date_idx ON public.petty_cash_entries(family_id, entry_date DESC);
INSERT INTO public.petty_cash_entries (family_id, kind, entry_date, amount, description, added_by, added_by_name)
SELECT f.id, v.kind, current_date - v.d, v.amount, v.description, v.by, v.byname
FROM public.families f,
(VALUES ('topup', 6, 100.00, 'Weekly float', 'family', 'Parent'),
        ('spend', 5, 12.40, 'Snacks after swimming', 'nanny', 'Jess'),
        ('spend', 3, 8.00, 'Bus fares to the park', 'nanny', 'Jess'),
        ('spend', 1, 21.50, 'Craft supplies', 'nanny', 'Jess')) AS v(kind, d, amount, description, by, byname)
WHERE f.slug = 'demo';