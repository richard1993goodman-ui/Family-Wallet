CREATE TABLE public.partner_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text,
  contact_email text,
  contact_phone text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.partner_agencies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_agencies TO authenticated;
ALTER TABLE public.partner_agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partner agencies" ON public.partner_agencies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.partner_agency_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.partner_agencies(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);
GRANT ALL ON public.partner_agency_staff TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_agency_staff TO authenticated;
ALTER TABLE public.partner_agency_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partner agency staff" ON public.partner_agency_staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.families ADD COLUMN partner_agency_id uuid REFERENCES public.partner_agencies(id) ON DELETE RESTRICT;
CREATE INDEX families_partner_agency_id_idx ON public.families(partner_agency_id);