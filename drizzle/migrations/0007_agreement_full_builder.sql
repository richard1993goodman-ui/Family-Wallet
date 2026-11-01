ALTER TABLE public.nanny_agreements
  ADD COLUMN IF NOT EXISTS agreement_data jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.nanny_agreements
SET agreement_data = jsonb_strip_nulls(jsonb_build_object(
  'employerName', employer_names,
  'nannyName', nanny_name,
  'startDate', CASE WHEN start_date IS NULL THEN NULL ELSE to_char(start_date, 'YYYY-MM-DD') END,
  'hourlyRate', hourly_rate,
  'paymentFrequency', pay_basis,
  'probationPeriod', probation,
  'standardNotice', notice_period,
  'holidayAllowance', holiday,
  'pension', pension,
  'otherDutiesClause', duties,
  'overtimePolicy', work_pattern,
  'legacyNotes', additional_terms
))
WHERE agreement_data = '{}'::jsonb;