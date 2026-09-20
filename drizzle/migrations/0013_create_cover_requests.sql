CREATE TABLE public.cover_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  cover_type text NOT NULL DEFAULT 'emergency',
  start_date date NOT NULL,
  end_date date,
  start_time text,
  end_time text,
  children text,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  requested_by text NOT NULL DEFAULT 'family',
  thread_id uuid REFERENCES public.support_threads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cover_requests_family_idx ON public.cover_requests (family_id, start_date DESC);

GRANT ALL ON public.cover_requests TO service_role;

ALTER TABLE public.cover_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage cover requests"
ON public.cover_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));