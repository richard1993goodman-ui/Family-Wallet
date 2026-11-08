-- Agency plan and household allowance. NULL allowance means "use the plan's default".
ALTER TABLE public.partner_agencies
 ADD COLUMN plan text NOT NULL DEFAULT 'partner' CHECK (plan IN ('partner','growth','scale','enterprise')),
 ADD COLUMN household_allowance integer CHECK (household_allowance IS NULL OR household_allowance >= 0);

-- Last time anyone opened the wallet; an "active household" is one seen in the last 30 days.
ALTER TABLE public.families ADD COLUMN last_active_at timestamptz;
CREATE INDEX families_last_active_idx ON public.families(partner_agency_id, last_active_at);

-- What each person does in the household. Existing rows were all nannies.
ALTER TABLE public.family_nannies
 ADD COLUMN role text NOT NULL DEFAULT 'nanny' CHECK (role IN ('nanny','au_pair','maternity_nurse','housekeeper','cook','driver','personal_assistant','tutor','other'));