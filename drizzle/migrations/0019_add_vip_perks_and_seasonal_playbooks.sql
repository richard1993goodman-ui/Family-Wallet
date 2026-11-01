CREATE TABLE public.partner_perks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  partner_name text NOT NULL,
  category text NOT NULL DEFAULT 'Family services',
  area text,
  offer_text text NOT NULL,
  description text,
  redemption_instructions text,
  offer_code text,
  website_url text,
  contact_text text,
  expires_on date,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_perks TO authenticated;
GRANT ALL ON public.partner_perks TO service_role;
ALTER TABLE public.partner_perks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partner perks" ON public.partner_perks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.seasonal_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  season text NOT NULL,
  topic text NOT NULL,
  introduction text,
  age_guidance text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_image_url text,
  resource_url text,
  audience text NOT NULL DEFAULT 'all',
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasonal_playbooks TO authenticated;
GRANT ALL ON public.seasonal_playbooks TO service_role;
ALTER TABLE public.seasonal_playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seasonal playbooks" ON public.seasonal_playbooks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.playbook_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid NOT NULL REFERENCES public.seasonal_playbooks(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playbook_id, family_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbook_recipients TO authenticated;
GRANT ALL ON public.playbook_recipients TO service_role;
ALTER TABLE public.playbook_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage playbook recipients" ON public.playbook_recipients FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.playbook_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid NOT NULL REFERENCES public.seasonal_playbooks(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  reader_role text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playbook_id, family_id, reader_role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbook_reads TO authenticated;
GRANT ALL ON public.playbook_reads TO service_role;
ALTER TABLE public.playbook_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view playbook reads" ON public.playbook_reads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX partner_perks_published_idx ON public.partner_perks (is_published, sort_order);
CREATE INDEX seasonal_playbooks_published_idx ON public.seasonal_playbooks (is_published, published_at DESC);
CREATE INDEX playbook_recipients_family_idx ON public.playbook_recipients (family_id);
CREATE INDEX playbook_reads_family_idx ON public.playbook_reads (family_id);