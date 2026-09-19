ALTER TABLE public.planner_entries
  ADD COLUMN entry_type text NOT NULL DEFAULT 'note',
  ADD COLUMN end_time_label text,
  ADD COLUMN status text NOT NULL DEFAULT 'active',
  ADD COLUMN added_by text NOT NULL DEFAULT 'family',
  ADD COLUMN notes text;

CREATE INDEX IF NOT EXISTS planner_entries_family_date_kind_idx ON public.planner_entries (family_id, entry_date, entry_type);

CREATE TABLE public.saved_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  title text NOT NULL,
  summary text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  saved_by text NOT NULL DEFAULT 'family',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.saved_resources TO service_role;
ALTER TABLE public.saved_resources ENABLE ROW LEVEL SECURITY;
CREATE INDEX saved_resources_family_type_idx ON public.saved_resources (family_id, resource_type, created_at DESC);

CREATE TABLE public.timesheet_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  break_minutes integer NOT NULL DEFAULT 0,
  is_overnight boolean NOT NULL DEFAULT false,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  submitted_by text NOT NULL DEFAULT 'nanny',
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.timesheet_shifts TO service_role;
ALTER TABLE public.timesheet_shifts ENABLE ROW LEVEL SECURITY;
CREATE INDEX timesheet_shifts_family_date_idx ON public.timesheet_shifts (family_id, shift_date DESC);