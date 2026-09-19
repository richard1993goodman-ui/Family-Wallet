CREATE TABLE public.nanny_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  employer_names text,
  nanny_name text,
  start_date date,
  work_pattern text,
  hours text,
  hourly_rate text,
  pay_basis text,
  holiday text,
  notice_period text,
  probation text,
  duties text,
  pension text,
  additional_terms text,
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  issued_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nanny_agreements TO authenticated;
GRANT ALL ON public.nanny_agreements TO service_role;
ALTER TABLE public.nanny_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage nanny agreements" ON public.nanny_agreements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.document_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  doc_kind text NOT NULL,
  signer_role text NOT NULL,
  signer_name text NOT NULL,
  doc_version text NOT NULL DEFAULT '1',
  client_key text,
  signed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX document_signatures_family_idx ON public.document_signatures (family_id, doc_kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_signatures TO authenticated;
GRANT ALL ON public.document_signatures TO service_role;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage document signatures" ON public.document_signatures
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));