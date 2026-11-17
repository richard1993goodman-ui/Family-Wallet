-- V2 Phase 5 step 3: messages and photos from the app (agreed 14 Nov).

-- Opening a conversation clears only your own side's unread dot. The existing "Members mark" rule (used when
-- replying) makes the updater the last sender, so a reader could not clear the dot without that side effect.
create or replace function public.mark_thread_read(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare side text;
begin
  select household_side(family_id) into side from household_threads where id = _id;
  if side is null then raise exception 'Conversation not found'; end if;
  update household_threads set family_unread = case when side = 'family' then false else family_unread end,
    nanny_unread = case when side = 'nanny' then false else nanny_unread end where id = _id;
end $$;
revoke execute on function public.mark_thread_read(uuid) from public, anon;
grant execute on function public.mark_thread_read(uuid) to authenticated, service_role;

-- Photo files live where V1 puts them: private bucket family-docs, moments/<family>/<file>.
-- shortcut: size and type are checked by the app (8 MB, images, as V1), not here; the bucket still caps files at 25 MB.
create policy "Members upload moment photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'family-docs'
  and (storage.foldername(name))[1] = 'moments'
  and case when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_household_member(((storage.foldername(name))[2])::uuid) else false end
);

-- Readable by the household only when a photo record points at it AND the file is in that household's photos
-- folder, so a photo record cannot be aimed at a private document in the vault.
create policy "Members read moment photos" on storage.objects for select to authenticated using (
  bucket_id = 'family-docs'
  and (storage.foldername(name))[1] = 'moments'
  and exists (select 1 from public.family_moments m where m.storage_path = objects.name
    and (storage.foldername(objects.name))[2] = m.family_id::text and public.is_household_member(m.family_id))
);
