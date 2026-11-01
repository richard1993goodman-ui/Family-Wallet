ALTER TABLE public.families
  ADD COLUMN nanny_bio text,
  ADD COLUMN nanny_photo_path text,
  ADD COLUMN nanny_emergency_name text,
  ADD COLUMN nanny_emergency_relationship text,
  ADD COLUMN nanny_emergency_phone text;

ALTER TABLE public.family_documents
  ADD COLUMN visibility text not null default 'document',
  ADD COLUMN issued_on date,
  ADD COLUMN reference_label text;

CREATE TABLE public.family_contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  relationship text,
  phone text not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_contacts TO authenticated;
GRANT ALL ON public.family_contacts TO service_role;

ALTER TABLE public.family_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage family contacts"
ON public.family_contacts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));