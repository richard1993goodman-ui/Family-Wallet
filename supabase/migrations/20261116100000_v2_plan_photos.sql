-- A photo on a planned item (school pick-up, the park), shown on the Home timeline (16 Nov, approved by the owner).
-- Only the household can add or see it: the files sit in family-docs under plans/<family>/ and are read through the
-- planned item that points at them, the same way moment photos are.
alter table public.planner_entries add column if not exists photo_path text;

create policy "Members upload plan photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'family-docs'
  and (storage.foldername(name))[1] = 'plans'
  and case when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_household_member(((storage.foldername(name))[2])::uuid) else false end
);

create policy "Members read plan photos" on storage.objects for select to authenticated using (
  bucket_id = 'family-docs'
  and (storage.foldername(name))[1] = 'plans'
  and exists (select 1 from public.planner_entries p where p.photo_path = objects.name
    and (storage.foldername(objects.name))[2] = p.family_id::text and public.is_household_member(p.family_id))
);
