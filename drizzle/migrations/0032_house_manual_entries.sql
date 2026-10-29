CREATE TABLE public.house_manual_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
 category text NOT NULL CHECK (category IN ('access','emergencies','rules','appliances')),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
 notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 4000),
 secret_value text CHECK (char_length(secret_value) <= 500),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.house_manual_entries TO service_role;
ALTER TABLE public.house_manual_entries ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.house_manual_entries IS 'Private household manual. Data API access is service-role only; application functions verify the existing family link-and-code session before every scoped read or write. Secret values are fetched separately on explicit reveal, never in list responses.';
CREATE INDEX house_manual_family_category ON public.house_manual_entries(family_id, category);