-- V2 agreement writer (Phase 9, decided 15 Nov: build it in the app). A parent writes the terms, saves a draft, and issues
-- them. Issuing keeps the exact wording and its SHA-256 as a version, which is what signing checks. Only a parent of the
-- family can write. Once issued, the wording can't be changed; later edits wait as a draft until issued again.

create or replace function public.save_agreement_draft(_family uuid, _nanny uuid, _data jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  _row nanny_agreements%rowtype;
  _id uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not is_household_owner(_family) then raise exception 'Only a parent can write an agreement.'; end if;
  if not exists (select 1 from family_nannies where id = _nanny and family_id = _family) then
    raise exception 'That nanny is not part of this family.';
  end if;
  if jsonb_typeof(coalesce(_data, '{}'::jsonb)) <> 'object' then raise exception 'The agreement is not in the right form.'; end if;
  if char_length(coalesce(_data ->> 'employerName', '')) > 200 or char_length(coalesce(_data ->> 'nannyName', '')) > 200 then
    raise exception 'A name is too long.';
  end if;

  select * into _row from nanny_agreements where family_id = _family;
  if _row.id is null then
    insert into nanny_agreements (family_id, nanny_id, status, version, agreement_data, updated_at)
      values (_family, _nanny, 'draft', 1, _data, now()) returning id into _id;
  else
    if _row.nanny_id is distinct from _nanny then
      raise exception 'This household already has an agreement with another nanny.';
    end if;
    if _row.status = 'draft' then
      update nanny_agreements set agreement_data = _data, updated_at = now() where id = _row.id;
    else
      update nanny_agreements set draft_data = _data, updated_at = now() where id = _row.id;
    end if;
    _id := _row.id;
  end if;
  insert into audit_log (actor_kind, actor_id, action, family_id)
    values ('parent', (select id::text from people where user_id = auth.uid()), 'agreement_draft_saved', _family);
  return _id;
end;
$$;

create or replace function public.issue_agreement(_family uuid, _nanny uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  _row nanny_agreements%rowtype;
  _data jsonb;
  _version integer;
  _text text;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not is_household_owner(_family) then raise exception 'Only a parent can issue an agreement.'; end if;
  select * into _row from nanny_agreements where family_id = _family and nanny_id = _nanny;
  if _row.id is null then raise exception 'Save a draft first.'; end if;

  _data := case when _row.status = 'draft' then _row.agreement_data else _row.draft_data end;
  if _data is null then raise exception 'Nothing has changed to issue.'; end if;
  if char_length(coalesce(_data ->> 'employerName', '')) < 2 or char_length(coalesce(_data ->> 'nannyName', '')) < 2
     or coalesce(_data ->> 'startDate', '') = '' or coalesce(_data ->> 'hourlyRate', '') = '' then
    raise exception 'Fill in both names, the start date and the hourly rate before issuing.';
  end if;

  -- The first issue is version 1; each later issue is the next version. Wording is saved exactly as issued.
  _version := case when _row.status = 'draft' then 1 else _row.version + 1 end;
  _text := _data::text;
  update nanny_agreements set status = 'issued', version = _version, agreement_data = _data, draft_data = null,
      issued_at = now(), updated_at = now()
    where id = _row.id;
  insert into agreement_versions (agreement_id, family_id, nanny_id, version, snapshot_text, content_hash, issued_at)
    values (_row.id, _family, _nanny, _version, _text, encode(sha256(convert_to(_text, 'UTF8')), 'hex'), now());
  insert into audit_log (actor_kind, actor_id, action, family_id)
    values ('parent', (select id::text from people where user_id = auth.uid()), 'agreement_issued', _family);
  return _version;
end;
$$;

revoke execute on function public.save_agreement_draft(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.issue_agreement(uuid, uuid) from public, anon;
grant execute on function public.save_agreement_draft(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.issue_agreement(uuid, uuid) to authenticated, service_role;
