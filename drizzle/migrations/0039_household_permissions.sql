CREATE TABLE public.household_permissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
 permission_key text NOT NULL CHECK (char_length(permission_key) BETWEEN 1 AND 80),
 label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120),
 category text NOT NULL DEFAULT 'other' CHECK (category IN ('health','outdoors','digital','travel','collection','other')),
 answer text NOT NULL CHECK (answer IN ('yes','no','ask_first')),
 note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
 is_custom boolean NOT NULL DEFAULT false,
 updated_by_name text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (family_id, permission_key)
);
GRANT ALL ON public.household_permissions TO service_role;
ALTER TABLE public.household_permissions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.household_permissions IS 'Household permissions and consents. Service-role only; server functions verify the family link-and-code session.';
CREATE INDEX household_permissions_family_idx ON public.household_permissions(family_id, category);
INSERT INTO public.household_permissions (family_id, permission_key, label, category, answer, note, is_custom, updated_by_name)
SELECT f.id, v.k, v.l, v.c, v.a, v.n, v.custom, 'Sarah'
FROM public.families f,
(VALUES
 ('sun_cream', 'Apply sun cream', 'health', 'yes', 'Factor 50 is in the hall cupboard.', false),
 ('medicine', 'Give Calpol or similar for a temperature', 'health', 'ask_first', 'Message me first unless it is over 38.5.', false),
 ('first_aid', 'Basic first aid and plasters', 'health', 'yes', '', false),
 ('photos_taken', 'Take photos of the children', 'digital', 'yes', 'Private wallet only, never on social media.', false),
 ('photos_social', 'Share photos on social media', 'digital', 'no', '', false),
 ('swimming', 'Swimming and water play', 'outdoors', 'ask_first', 'Only at the leisure centre.', false),
 ('collector:granny-pat', 'Authorised to collect: Granny Pat', 'collection', 'yes', 'Oliver and Mia''s grandmother. Has her own key.', true)
) AS v(k, l, c, a, n, custom)
WHERE f.slug = 'demo';