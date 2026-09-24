CREATE TABLE public.agency_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date date,
  audience text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.agency_challenges TO service_role;
ALTER TABLE public.agency_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.challenge_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.agency_challenges(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  UNIQUE (challenge_id, family_id)
);
GRANT ALL ON public.challenge_recipients TO service_role;
ALTER TABLE public.challenge_recipients ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.agency_challenges(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  note text,
  completed_by text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, family_id)
);
GRANT ALL ON public.challenge_completions TO service_role;
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;