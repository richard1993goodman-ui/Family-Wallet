CREATE TABLE public.sports_passport_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_name text NOT NULL,
  activity text NOT NULL,
  skill_area text NOT NULL DEFAULT 'general',
  confidence_level integer NOT NULL DEFAULT 3 CHECK (confidence_level BETWEEN 1 AND 5),
  effort_level integer NOT NULL DEFAULT 3 CHECK (effort_level BETWEEN 1 AND 5),
  minutes integer NOT NULL DEFAULT 30 CHECK (minutes >= 0 AND minutes <= 600),
  badge text,
  notes text,
  logged_by text NOT NULL DEFAULT 'family' CHECK (logged_by IN ('family', 'nanny')),
  logged_by_name text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sports_passport_entries TO service_role;
ALTER TABLE public.sports_passport_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sports passport entries"
ON public.sports_passport_entries
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX sports_passport_entries_family_date_idx ON public.sports_passport_entries(family_id, entry_date DESC);

CREATE TABLE public.handover_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nanny_id uuid REFERENCES public.family_nannies(id) ON DELETE SET NULL,
  handover_date date NOT NULL DEFAULT CURRENT_DATE,
  homework_status text,
  dinner_status text,
  water_status text,
  mood text,
  energy text,
  school_bag_ready boolean NOT NULL DEFAULT false,
  pe_kit_ready boolean NOT NULL DEFAULT false,
  reading_done boolean NOT NULL DEFAULT false,
  tomorrow_notes text,
  parent_notes text,
  submitted_by text NOT NULL DEFAULT 'family' CHECK (submitted_by IN ('family', 'nanny')),
  submitted_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.handover_checklists TO service_role;
ALTER TABLE public.handover_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage handover checklists"
ON public.handover_checklists
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX handover_checklists_family_date_idx ON public.handover_checklists(family_id, handover_date DESC);

CREATE TABLE public.expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nanny_id uuid REFERENCES public.family_nannies(id) ON DELETE SET NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  item text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0 AND amount <= 10000),
  category text NOT NULL DEFAULT 'other',
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reimbursed', 'declined')),
  submitted_by text NOT NULL DEFAULT 'family' CHECK (submitted_by IN ('family', 'nanny')),
  submitted_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.expense_claims TO service_role;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage expense claims"
ON public.expense_claims
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX expense_claims_family_date_idx ON public.expense_claims(family_id, expense_date DESC);
CREATE INDEX expense_claims_family_status_idx ON public.expense_claims(family_id, status);