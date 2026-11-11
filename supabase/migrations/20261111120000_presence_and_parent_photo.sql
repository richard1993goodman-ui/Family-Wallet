-- Header avatars: a parent headshot, and "last seen" for each parent/nanny so the app can show who is online.
alter table public.families
  add column if not exists parent_photo_path text,
  add column if not exists parent_last_seen_at timestamptz;
alter table public.family_nannies
  add column if not exists last_seen_at timestamptz;
