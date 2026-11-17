-- V2 Phase 5 step 1: upload a staff member's document from the app (agreed 14 Nov).
-- Parents upload for any of their staff; a staff member uploads her own. Same vault as V1 (wallet_documents,
-- private bucket family-docs, vault/<family>/<file>), same limits: 10 MB, PDF/JPG/PNG/WebP, 300 per household.
-- Two steps: the app puts the file in the household's folder, then add_staff_document checks the file and
-- records it. A file with no record stays unreadable (reading needs a record).
-- shortcut: the file type is what the phone declares, not a check of the file's first bytes as V1's server does; move to a server function if that matters.

create policy "Members upload vault files" on storage.objects for insert to authenticated with check (
  bucket_id = 'family-docs'
  and (storage.foldername(name))[1] = 'vault'
  -- case, so a folder name that is not an id is refused instead of breaking the cast
  and case when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_household_owner(((storage.foldername(name))[2])::uuid)
      or public.my_staff_nanny(((storage.foldername(name))[2])::uuid) is not null
    else false end
);

create or replace function public.add_staff_document(
  _family uuid, _nanny uuid, _category text, _title text, _path text, _file_name text, _issued date, _expires date
) returns uuid language plpgsql security definer set search_path = public as $$
declare o storage.objects; parent boolean := is_household_owner(_family); mine uuid := my_staff_nanny(_family);
  size bigint; mime text; new_id uuid;
begin
  if _category not in ('dbs','id','passport','right_to_work','proof_of_address','first_aid','insurance','agreement','other') then
    raise exception 'Unknown document type'; end if;
  if not exists (select 1 from family_nannies where id = _nanny and family_id = _family) then raise exception 'Staff member not found'; end if;
  if not (parent or mine = _nanny) then raise exception 'Only parents or that staff member can add this'; end if;
  if _path not like 'vault/' || _family || '/%' then raise exception 'File is in the wrong place'; end if;
  select * into o from storage.objects where bucket_id = 'family-docs' and name = _path and owner_id = auth.uid()::text;
  if not found then raise exception 'File not found'; end if;
  size := (o.metadata->>'size')::bigint;
  mime := o.metadata->>'mimetype';
  if size is null or size <= 0 or size > 10 * 1024 * 1024 then raise exception 'Files must be 10 MB or smaller'; end if;
  if mime is null or mime not in ('application/pdf','image/jpeg','image/png','image/webp') then raise exception 'Only PDF, JPG, PNG or WebP files'; end if;
  if (select count(*) from wallet_documents where family_id = _family) >= 300 then raise exception 'The vault is full (300 documents)'; end if;
  if _expires is not null and _issued is not null and _expires < _issued then raise exception 'Expiry is before the issue date'; end if;
  insert into wallet_documents (family_id, nanny_id, category, title, file_name, content_type, size_bytes, storage_path,
    issued_on, expires_on, shared_with_staff, uploaded_by, uploaded_by_nanny_id)
  values (_family, _nanny, _category, coalesce(left(nullif(trim(_title), ''), 120), _category),
    left(coalesce(nullif(trim(_file_name), ''), 'document'), 200), mime, size, _path,
    _issued, _expires, false, case when parent then 'family' else 'nanny' end, case when parent then null else mine end)
  returning id into new_id;
  return new_id;
end $$;

revoke execute on function public.add_staff_document(uuid, uuid, text, text, text, text, date, date) from public, anon;
grant execute on function public.add_staff_document(uuid, uuid, text, text, text, text, date, date) to authenticated, service_role;
