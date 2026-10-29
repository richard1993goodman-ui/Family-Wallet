CREATE TABLE public.agency_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.partner_agencies(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX agency_terms_agency_key ON public.agency_terms ((coalesce(agency_id, '00000000-0000-0000-0000-000000000000'::uuid)));
GRANT ALL ON public.agency_terms TO service_role;
ALTER TABLE public.agency_terms ENABLE ROW LEVEL SECURITY;