-- V2 Wallet (plan 5i, agreed 15 Nov): petty cash and household documents from the app, and "Paid from petty cash"
-- in Groceries. Test copy first; live only with approval. Additive: two new nullable columns, new functions, one storage
-- rule; buy_groceries and add_staff_document gain an optional last argument (old calls behave exactly as before).

-- Who added a petty cash entry, so staff can remove only their own from the app. Website rows leave it empty.
alter table public.petty_cash_entries add column created_by uuid default auth.uid();
-- The petty cash entry a grocery purchase was paid from.
alter table public.grocery_items add column petty_cash_id uuid references public.petty_cash_entries(id) on delete set null;

-- Remove a petty cash entry: a parent any; staff only spending they added themselves in the app.
create or replace function public.remove_petty_cash(_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare r petty_cash_entries;
begin
  select * into r from petty_cash_entries where id = _id;
  if not found or not (is_household_owner(r.family_id)
    or (r.kind = 'spend' and r.added_by = 'nanny' and r.created_by = auth.uid() and my_staff_nanny(r.family_id) is not null)) then
    raise exception 'You cannot remove that entry';
  end if;
  delete from petty_cash_entries where id = _id;
end $$;

-- Tick items off. With an amount: staff's own money adds one pending Food/snacks expense in their name (as before);
-- _from_float (anyone in the household) logs one spend against the petty cash float instead.
-- Returns the new expense's or petty cash entry's id, or null when there was no amount.
drop function public.buy_groceries(uuid[], numeric);
create function public.buy_groceries(_ids uuid[], _amount numeric default null, _from_float boolean default false)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare fam uuid; n int; fams int; who text; nanny uuid; names text; exp uuid; petty uuid; tz text; cur text;
begin
  select count(*), count(distinct family_id), min(family_id::text)::uuid into n, fams, fam
    from grocery_items where id = any(_ids) and bought_at is null;
  if n = 0 or n <> cardinality(_ids) or fams <> 1 or not is_household_member(fam) then
    raise exception 'Those items are not on your list';
  end if;
  select display_name into who from people where user_id = auth.uid();
  if _from_float and _amount is null then raise exception 'Type what was spent from petty cash'; end if;
  if _amount is not null then
    if _amount <= 0 or _amount > 10000 then raise exception 'Amount must be more than 0 and up to 10,000'; end if;
    select string_agg(name, ', ' order by created_at) into names from grocery_items where id = any(_ids);
    select time_zone, currency into tz, cur from families where id = fam;
    if _from_float then
      insert into petty_cash_entries (family_id, kind, entry_date, amount, description, added_by, added_by_name, currency)
        values (fam, 'spend', (now() at time zone coalesce(tz, 'Europe/London'))::date, round(_amount, 2),
          left('Groceries: ' || names, 200), household_side(fam),
          coalesce(who, case when household_side(fam) = 'family' then 'Parent' else 'Nanny' end), coalesce(cur, 'GBP'))
        returning id into petty;
    else
      nanny := my_staff_nanny(fam);
      if nanny is null then raise exception 'Only staff add a grocery expense'; end if;
      insert into expense_claims (family_id, nanny_id, expense_date, item, amount, currency, category, status, submitted_by, submitted_by_name)
        values (fam, nanny, (now() at time zone coalesce(tz, 'Europe/London'))::date, left('Groceries: ' || names, 200),
          round(_amount, 2), coalesce(cur, 'GBP'), 'food', 'pending', 'nanny', who)
        returning id into exp;
    end if;
  end if;
  update grocery_items set bought_at = now(), bought_by = auth.uid(), bought_by_name = who, expense_id = exp, petty_cash_id = petty
    where id = any(_ids);
  return coalesce(exp, petty);
end $$;

-- Household documents (nanny_id null). add_staff_document now also takes them: _nanny null means the household's own,
-- parents only, with _shared deciding whether staff can open it. Staff documents behave exactly as before.
drop function public.add_staff_document(uuid, uuid, text, text, text, text, date, date);
create function public.add_staff_document(
  _family uuid, _nanny uuid, _category text, _title text, _path text, _file_name text, _issued date, _expires date, _shared boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
declare o storage.objects; parent boolean := is_household_owner(_family); mine uuid := my_staff_nanny(_family);
  size bigint; mime text; new_id uuid;
begin
  if _category not in ('dbs','id','passport','right_to_work','proof_of_address','first_aid','insurance','agreement','other') then
    raise exception 'Unknown document type'; end if;
  if _nanny is null then
    if not parent then raise exception 'Only parents can add household documents'; end if;
  else
    if not exists (select 1 from family_nannies where id = _nanny and family_id = _family) then raise exception 'Staff member not found'; end if;
    if not (parent or mine = _nanny) then raise exception 'Only parents or that staff member can add this'; end if;
  end if;
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
    _issued, _expires, _nanny is null and coalesce(_shared, false), case when parent then 'family' else 'nanny' end, case when parent then null else mine end)
  returning id into new_id;
  return new_id;
end $$;

-- Parents share or stop sharing a household document with staff.
create or replace function public.share_document(_id uuid, _shared boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update wallet_documents set shared_with_staff = _shared where id = _id and nanny_id is null and is_household_owner(family_id);
  if not found then raise exception 'You cannot change that document'; end if;
end $$;

-- Parents remove a household document; returns the file's path so the app can delete the file next
-- (the storage rule below only allows that once no record points at it).
create or replace function public.remove_document(_id uuid)
returns text language plpgsql security definer set search_path to 'public' as $$
declare p text;
begin
  delete from wallet_documents where id = _id and nanny_id is null and is_household_owner(family_id) returning storage_path into p;
  if p is null then raise exception 'You cannot remove that document'; end if;
  return p;
end $$;

-- Storage can only delete a file it can also see, so the same rule is needed for reading (the household's own folder,
-- parents only, files with no record).
create policy "Parents see removed vault files" on storage.objects for select to authenticated using (
  bucket_id = 'family-docs'
  and (storage.foldername(name))[1] = 'vault'
  and case when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_household_owner(((storage.foldername(name))[2])::uuid) else false end
  and not exists (select 1 from public.wallet_documents d where d.storage_path = objects.name)
);
create policy "Parents delete removed vault files" on storage.objects for delete to authenticated using (
  bucket_id = 'family-docs'
  and (storage.foldername(name))[1] = 'vault'
  and case when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_household_owner(((storage.foldername(name))[2])::uuid) else false end
  and not exists (select 1 from public.wallet_documents d where d.storage_path = objects.name)
);

revoke execute on function public.add_staff_document(uuid, uuid, text, text, text, text, date, date, boolean) from public, anon;
revoke execute on function public.share_document(uuid, boolean) from public, anon;
revoke execute on function public.remove_document(uuid) from public, anon;
grant execute on function public.add_staff_document(uuid, uuid, text, text, text, text, date, date, boolean) to authenticated, service_role;
grant execute on function public.share_document(uuid, boolean) to authenticated, service_role;
grant execute on function public.remove_document(uuid) to authenticated, service_role;

revoke execute on function public.remove_petty_cash(uuid) from public, anon;
revoke execute on function public.buy_groceries(uuid[], numeric, boolean) from public, anon;
grant execute on function public.remove_petty_cash(uuid) to authenticated, service_role;
grant execute on function public.buy_groceries(uuid[], numeric, boolean) to authenticated, service_role;
