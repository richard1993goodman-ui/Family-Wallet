CREATE TABLE public.incident_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
 child_name text NOT NULL CHECK (char_length(child_name) BETWEEN 1 AND 120),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 kind text NOT NULL DEFAULT 'accident' CHECK (kind IN ('accident','near_miss','behaviour','illness','other')),
 severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','needed_first_aid','needed_medical_help')),
 what_happened text NOT NULL CHECK (char_length(what_happened) BETWEEN 1 AND 2000),
 action_taken text NOT NULL DEFAULT '' CHECK (char_length(action_taken) <= 2000),
 parents_told boolean NOT NULL DEFAULT false,
 reported_by text NOT NULL DEFAULT 'nanny' CHECK (reported_by IN ('family','nanny')),
 reported_by_name text,
 acknowledged_at timestamptz,
 acknowledged_by_name text,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.incident_reports TO service_role;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.incident_reports IS 'Accident and incident reports. Service-role only; server functions verify the family link-and-code session.';
CREATE INDEX incident_reports_family_idx ON public.incident_reports(family_id, occurred_at DESC);
INSERT INTO public.incident_reports (family_id, child_name, occurred_at, kind, severity, what_happened, action_taken, parents_told, reported_by, reported_by_name, acknowledged_at, acknowledged_by_name)
SELECT f.id, v.child, now() - v.ago, v.kind, v.sev, v.what, v.act, v.told, 'nanny', 'Jess', v.ack, v.ackby
FROM public.families f,
(VALUES
 ('Oliver', interval '9 days', 'accident', 'minor', 'Tripped on the park path and grazed his left knee.', 'Cleaned the graze, plaster on, cuddle and a snack. He was playing again within five minutes.', true, now() - interval '9 days' + interval '2 hours', 'Sarah'),
 ('Mia', interval '2 hours', 'accident', 'needed_first_aid', 'Bumped her head on the corner of the coffee table while dancing.', 'Cold compress for ten minutes. No sickness or drowsiness. Watching her closely this evening.', true, NULL::timestamptz, NULL::text)
) AS v(child, ago, kind, sev, what, act, told, ack, ackby)
WHERE f.slug = 'demo';
