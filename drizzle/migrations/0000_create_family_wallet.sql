-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Families
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  family_name text NOT NULL,
  contact_email text,
  contact_phone text,
  tier_band text NOT NULL DEFAULT '3',
  nanny_name text,
  start_date date,
  terms_accepted_on date,
  notes text,
  access_code_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT ALL ON public.families TO service_role;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage families"
ON public.families FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Documents
CREATE TABLE public.family_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, doc_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_documents TO authenticated;
GRANT ALL ON public.family_documents TO service_role;
ALTER TABLE public.family_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage family documents"
ON public.family_documents FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Access attempts (rate limiting); service_role only
CREATE TABLE public.wallet_access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  client_key text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_access_attempts_lookup ON public.wallet_access_attempts (client_key, attempted_at DESC);
GRANT ALL ON public.wallet_access_attempts TO service_role;
ALTER TABLE public.wallet_access_attempts ENABLE ROW LEVEL SECURITY;

-- Storage: admins manage wallet documents; families never read storage directly
CREATE POLICY "Admins manage family docs storage"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'family-docs' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'family-docs' AND public.has_role(auth.uid(), 'admin'));
