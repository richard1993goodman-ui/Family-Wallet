-- Who changed what (drives unread badges and push), per-person last-seen times, and push subscriptions.
-- Server-side access only (service role), like the other wallet tables: RLS on, no policies.
CREATE TABLE public.wallet_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  feature text NOT NULL,
  actor text NOT NULL CHECK (actor IN ('family','nanny')),
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_activity_family_time_idx ON public.wallet_activity(family_id, created_at DESC);

CREATE TABLE public.wallet_seen (
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('family','nanny')),
  feature text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, role, feature)
);

-- Pushes carry no content: the service worker asks /api/push/latest what to show, looked up by endpoint.
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  slug text NOT NULL,
  role text NOT NULL CHECK (role IN ('family','nanny')),
  endpoint text NOT NULL UNIQUE,
  muted_features text[] NOT NULL DEFAULT '{}',
  quiet_start smallint CHECK (quiet_start BETWEEN 0 AND 23),
  quiet_end smallint CHECK (quiet_end BETWEEN 0 AND 23),
  tz text NOT NULL DEFAULT 'Europe/London',
  last_delivered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_subscriptions_family_idx ON public.push_subscriptions(family_id);

GRANT ALL ON public.wallet_activity, public.wallet_seen, public.push_subscriptions TO service_role;
ALTER TABLE public.wallet_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
