-- V2 Phase 4 recurring commitments (agreed 14 Nov). A weekly commitment is saved as one ordinary row per week,
-- so the website shows every week too and each week can be skipped (or later marked done) on its own.
-- series_id links the weeks; nanny_id says who is responsible, and must be a nanny of the same household.
alter table public.family_nannies add constraint family_nannies_id_family_key unique (id, family_id);

alter table public.planner_entries
  add column if not exists series_id uuid,
  add column if not exists nanny_id uuid,
  add constraint planner_entries_nanny_same_household foreign key (nanny_id, family_id)
    references public.family_nannies (id, family_id) on delete set null (nanny_id);

create index if not exists planner_entries_series_idx on public.planner_entries (series_id) where series_id is not null;
