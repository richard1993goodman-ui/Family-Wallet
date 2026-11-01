CREATE TABLE public.nanny_safety_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nanny_id uuid NOT NULL REFERENCES public.family_nannies(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('dbs', 'first_aid', 'right_to_work', 'reference_1', 'reference_2', 'public_liability')),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  issued_on date,
  expires_on date,
  reference_label text,
  visibility text NOT NULL DEFAULT 'badge' CHECK (visibility IN ('document', 'badge', 'hidden')),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nanny_id, document_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nanny_safety_documents TO authenticated;
GRANT ALL ON public.nanny_safety_documents TO service_role;
ALTER TABLE public.nanny_safety_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage nanny safety documents"
ON public.nanny_safety_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX nanny_safety_documents_family_id_idx ON public.nanny_safety_documents(family_id);
CREATE INDEX nanny_safety_documents_nanny_id_idx ON public.nanny_safety_documents(nanny_id);