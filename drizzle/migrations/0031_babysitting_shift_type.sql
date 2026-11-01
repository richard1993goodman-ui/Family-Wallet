ALTER TABLE public.timesheet_shifts ADD COLUMN shift_type text NOT NULL DEFAULT 'nanny';
ALTER TABLE public.timesheet_shifts ADD CONSTRAINT timesheet_shifts_shift_type_check CHECK (shift_type IN ('nanny', 'babysitting'));
COMMENT ON COLUMN public.timesheet_shifts.shift_type IS 'nanny = regular agreed hours; babysitting = ad-hoc/evening sits kept separate from the nanny timesheet.';