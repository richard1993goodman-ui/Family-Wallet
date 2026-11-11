-- Stage E3: edits to an agreement that has already been issued are held here as pending changes.
-- agreement_data keeps the issued wording that people signed until the changes are issued again as a new version.
alter table public.nanny_agreements add column if not exists draft_data jsonb;
