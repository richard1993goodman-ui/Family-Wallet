CREATE TABLE public.household_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  topic text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  created_by text NOT NULL,
  last_sender text NOT NULL,
  family_unread boolean NOT NULL DEFAULT false,
  nanny_unread boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_threads TO authenticated;
GRANT ALL ON public.household_threads TO service_role;
ALTER TABLE public.household_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage household threads" ON public.household_threads FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX household_threads_family_idx ON public.household_threads(family_id, updated_at DESC);

CREATE TABLE public.household_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.household_threads(id) ON DELETE CASCADE,
  sender text NOT NULL,
  sender_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_messages TO authenticated;
GRANT ALL ON public.household_messages TO service_role;
ALTER TABLE public.household_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage household messages" ON public.household_messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX household_messages_thread_idx ON public.household_messages(thread_id, created_at);

WITH t AS (
  INSERT INTO public.household_threads (family_id, topic, title, created_by, last_sender, family_unread)
  SELECT id, 'child', 'Oliver''s swimming kit', 'family', 'nanny', true FROM public.families WHERE slug = 'demo'
  RETURNING id
)
INSERT INTO public.household_messages (thread_id, sender, sender_name, body, created_at)
SELECT t.id, v.sender, v.name, v.body, now() - v.ago FROM t,
(VALUES ('family', 'Parent', 'Swimming moved to Thursday this week — kit is in the hall cupboard.', interval '2 hours'),
        ('nanny', 'Jess', 'Perfect, I''ll grab it. Do we need a new pair of goggles? The strap is snapping.', interval '1 hour')) AS v(sender, name, body, ago);