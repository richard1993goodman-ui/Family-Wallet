-- The household's private document vault: DBS checks, ID, passports, right to work and other key documents,
-- uploaded by the family or by a staff member. Files live in the private family-docs bucket under vault/<family>/.
-- Service role only: RLS on with no policies, so the browser can never read this table or the files directly.
create table if not exists public.wallet_documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  -- Whose document it is: the household itself, or one staff member.
  nanny_id uuid references public.family_nannies(id) on delete cascade,
  category text not null,
  title text not null,
  file_name text not null,
  content_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  storage_path text not null unique,
  issued_on date,
  expires_on date,
  -- For the household's own documents: whether household staff may open it too.
  shared_with_staff boolean not null default false,
  uploaded_by text not null check (uploaded_by in ('family', 'nanny')),
  uploaded_by_nanny_id uuid references public.family_nannies(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wallet_documents_family_idx on public.wallet_documents (family_id, created_at desc);
alter table public.wallet_documents enable row level security;
