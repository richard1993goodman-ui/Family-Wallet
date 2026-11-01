CREATE TABLE public.family_nannies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text,
  photo_path text,
  emergency_name text,
  emergency_relationship text,
  emergency_phone text,
  nanny_code text,
  nanny_code_hash text,
  invited_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_nannies TO authenticated;
GRANT ALL ON public.family_nannies TO service_role;

ALTER TABLE public.family_nannies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage family nannies"
ON public.family_nannies FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX family_nannies_family_id_idx ON public.family_nannies (family_id);

ALTER TABLE public.nanny_agreements
  ADD COLUMN nanny_id uuid REFERENCES public.family_nannies(id) ON DELETE CASCADE;

ALTER TABLE public.document_signatures
  ADD COLUMN nanny_id uuid REFERENCES public.family_nannies(id) ON DELETE CASCADE;

INSERT INTO public.family_nannies (
  family_id, name, bio, photo_path,
  emergency_name, emergency_relationship, emergency_phone,
  nanny_code, nanny_code_hash, invited_at
)
SELECT
  f.id,
  COALESCE(NULLIF(btrim(f.nanny_name), ''), 'Nanny'),
  f.nanny_bio,
  f.nanny_photo_path,
  f.nanny_emergency_name,
  f.nanny_emergency_relationship,
  f.nanny_emergency_phone,
  f.nanny_code,
  f.nanny_code_hash,
  f.nanny_invited_at
FROM public.families f
WHERE COALESCE(NULLIF(btrim(f.nanny_name), ''), f.nanny_code, f.nanny_bio, f.nanny_emergency_name) IS NOT NULL;

UPDATE public.nanny_agreements a
SET nanny_id = n.id
FROM public.family_nannies n
WHERE n.family_id = a.family_id AND a.nanny_id IS NULL;

UPDATE public.document_signatures s
SET nanny_id = n.id
FROM public.family_nannies n
WHERE n.family_id = s.family_id AND s.nanny_id IS NULL AND s.doc_kind = 'agreement';

CREATE INDEX nanny_agreements_nanny_id_idx ON public.nanny_agreements (nanny_id);
CREATE INDEX document_signatures_nanny_id_idx ON public.document_signatures (nanny_id);