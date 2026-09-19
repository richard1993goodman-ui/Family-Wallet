CREATE TABLE public.family_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL UNIQUE REFERENCES public.families(id) ON DELETE CASCADE,
  home_address text,
  important_addresses text,
  house_rules text,
  screen_time_rules text,
  homework_expectations text,
  gp_details text,
  medical_notes text,
  emergency_instructions text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_profile TO authenticated;
GRANT ALL ON public.family_profile TO service_role;
ALTER TABLE public.family_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage family profile" ON public.family_profile FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.family_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  date_of_birth date,
  photo_path text,
  school text,
  year_group text,
  school_hours text,
  allergies text,
  dietary text,
  medication text,
  personality text,
  interests text,
  dislikes text,
  morning_routine text,
  bedtime_routine text,
  what_makes_them_tick text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX family_children_family_idx ON public.family_children (family_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_children TO authenticated;
GRANT ALL ON public.family_children TO service_role;
ALTER TABLE public.family_children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage family children" ON public.family_children FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.planner_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  time_label text,
  title text NOT NULL,
  child_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX planner_entries_family_date_idx ON public.planner_entries (family_id, entry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_entries TO authenticated;
GRANT ALL ON public.planner_entries TO service_role;
ALTER TABLE public.planner_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage planner entries" ON public.planner_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  activities text,
  food text,
  homework text,
  mood text,
  notes text,
  tomorrow text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX daily_logs_family_date_idx ON public.daily_logs (family_id, log_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_logs TO authenticated;
GRANT ALL ON public.daily_logs TO service_role;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage daily logs" ON public.daily_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  last_sender text NOT NULL DEFAULT 'family',
  family_unread boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_threads_family_idx ON public.support_threads (family_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_threads TO authenticated;
GRANT ALL ON public.support_threads TO service_role;
ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage support threads" ON public.support_threads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  sender text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_thread_idx ON public.support_messages (thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage support messages" ON public.support_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));