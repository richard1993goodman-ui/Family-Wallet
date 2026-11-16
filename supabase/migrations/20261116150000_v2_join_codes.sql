-- V2 (decided 16 Nov): one-time join codes for staff as well as another parent. A parent makes a code in the app and shares
-- it; the nanny, au pair or staff member signs in, types it, and lands on the dashboard. No email is sent.
-- A code with nanny_id set joins as that staff member; without it, as a co-parent (unchanged).

alter table public.co_parent_codes add column if not exists nanny_id uuid references public.family_nannies(id) on delete cascade;

create or replace function public.create_join_code(_family uuid, _nanny uuid default null)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _code text;
  _person uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not is_household_owner(_family) then raise exception 'Only a parent can make a code.'; end if;
  if _nanny is not null then
    if not exists (select 1 from family_nannies where id = _nanny and family_id = _family) then raise exception 'Staff member not found.'; end if;
    if exists (select 1 from household_members where nanny_id = _nanny and status = 'active') then raise exception 'This staff member already has a login.'; end if;
  end if;
  -- 40 random bits, shown as XXXX-XXXX. Only the hash is kept.
  _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  select id into _person from people where user_id = auth.uid();
  insert into co_parent_codes (family_id, code_hash, created_by, expires_at, nanny_id)
    values (_family, encode(sha256(convert_to(_code, 'UTF8')), 'hex'), _person, now() + interval '48 hours', _nanny);
  insert into audit_log (actor_kind, actor_id, action, family_id)
    values ('parent', _person::text, case when _nanny is null then 'co_parent_code_made' else 'staff_code_made' end, _family);
  return _code;
end;
$$;

revoke all on function public.create_join_code(uuid, uuid) from public, anon;
grant execute on function public.create_join_code(uuid, uuid) to authenticated;

-- The same redeem function as before, now also joining staff. Wrong-code limits and one-time use are unchanged.
create or replace function public.redeem_co_parent_code(_code text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  -- Ignore spaces, dashes and case, then put the dash back as it was made (XXXX-XXXX).
  _clean text := (select substr(s, 1, 4) || '-' || substr(s, 5, 4) from (select regexp_replace(upper(coalesce(_code, '')), '[^A-Z0-9]', '', 'g') s) x);
  _person uuid;
  _row co_parent_codes%rowtype;
  _recent_failures int;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  select id into _person from people where user_id = auth.uid();
  if _person is null then raise exception 'Enter your name first.'; end if;

  -- Slow down guessing: ten wrong codes in an hour stops further tries for that person.
  select count(*) into _recent_failures from audit_log
    where actor_id = _person::text and action = 'co_parent_code_failed' and at > now() - interval '1 hour';
  if _recent_failures >= 10 then raise exception 'Too many wrong codes. Please try again in an hour.'; end if;

  select * into _row from co_parent_codes
    where code_hash = encode(sha256(convert_to(_clean, 'UTF8')), 'hex') and used_at is null and expires_at > now();
  if _row.id is null then
    insert into audit_log (actor_kind, actor_id, action) values ('parent', _person::text, 'co_parent_code_failed');
    raise exception 'That code is not right, or it has expired. Ask the family for a new one.';
  end if;

  if not exists (select 1 from families where id = _row.family_id and status = 'active') then
    raise exception 'This family is not set up yet.';
  end if;
  if exists (select 1 from household_members where family_id = _row.family_id and person_id = _person and status = 'active') then
    raise exception 'You already belong to this family.';
  end if;

  update co_parent_codes set used_at = now() where id = _row.id and used_at is null;
  if _row.nanny_id is null then
    insert into household_members (family_id, person_id, role, status) values (_row.family_id, _person, 'co_parent', 'active');
    insert into audit_log (actor_kind, actor_id, action, family_id) values ('parent', _person::text, 'co_parent_joined', _row.family_id);
  else
    if exists (select 1 from household_members where nanny_id = _row.nanny_id and status = 'active') then
      raise exception 'This staff member already has a login. Ask a parent for help.';
    end if;
    -- A staff member who left and came back reuses their old row (one row per staff member).
    update household_members set person_id = _person, status = 'active', started_at = now(), ended_at = null, revoked_by = null
      where nanny_id = _row.nanny_id;
    if not found then
      insert into household_members (family_id, person_id, role, nanny_id, status) values (_row.family_id, _person, 'staff', _row.nanny_id, 'active');
    end if;
    insert into audit_log (actor_kind, actor_id, action, family_id) values ('nanny', _person::text, 'staff_joined', _row.family_id);
  end if;
  return _row.family_id;
end;
$$;
