CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nanny_id uuid REFERENCES public.family_nannies(id) ON DELETE CASCADE,
  leave_type text NOT NULL DEFAULT 'holiday',
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  requested_by text NOT NULL DEFAULT 'nanny',
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX leave_requests_family_idx ON public.leave_requests (family_id, start_date);
CREATE INDEX leave_requests_nanny_idx ON public.leave_requests (nanny_id);

GRANT ALL ON public.leave_requests TO service_role;

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage leave requests"
ON public.leave_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));