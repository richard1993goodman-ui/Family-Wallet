-- Stage E2: a governed library of agreement templates. Tables only: no template is seeded, and nothing here says any
-- wording is legally reviewed. A template version counts as approved only when a named reviewer and review date are recorded.

create table if not exists public.agreement_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('employment', 'self_employed', 'au_pair', 'babysitter', 'live_in', 'other')),
  -- ISO 3166 country, with an optional region after a dash, for example GB or GB-ENG or US-CA.
  jurisdiction text not null,
  language text not null default 'en',
  title text not null,
  created_at timestamptz not null default now(),
  unique (kind, jurisdiction, language)
);

create table if not exists public.agreement_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.agreement_templates(id) on delete restrict,
  version integer not null check (version > 0),
  body jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'under_review', 'approved', 'superseded')),
  reviewer_name text,
  reviewer_role text,
  reviewed_at date,
  review_notes text,
  changelog text,
  created_at timestamptz not null default now(),
  -- Approval needs a named reviewer and a date, so a template can never be marked approved anonymously.
  check (status <> 'approved' or (reviewer_name is not null and reviewed_at is not null)),
  unique (template_id, version)
);

-- Once approved, wording and review details are frozen. The only change allowed is moving it to superseded.
create or replace function public.freeze_approved_template() returns trigger
language plpgsql as $$
begin
  if old.status in ('approved', 'superseded') then
    if old.status = 'approved' and new.status = 'superseded'
       and new.body = old.body and new.version = old.version and new.template_id = old.template_id
       and new.reviewer_name is not distinct from old.reviewer_name and new.reviewed_at is not distinct from old.reviewed_at then
      return new;
    end if;
    raise exception 'An approved agreement template version cannot be edited. Make a new version instead.';
  end if;
  return new;
end $$;

drop trigger if exists freeze_approved_template on public.agreement_template_versions;
create trigger freeze_approved_template before update on public.agreement_template_versions
  for each row execute function public.freeze_approved_template();

alter table public.agreement_templates enable row level security;
alter table public.agreement_template_versions enable row level security;
revoke delete, truncate on public.agreement_templates, public.agreement_template_versions from anon, authenticated, service_role;

-- Each issued agreement version can say which template version it was built from (empty for the built-in builder).
alter table public.agreement_versions add column if not exists template_version_id uuid references public.agreement_template_versions(id) on delete restrict;
