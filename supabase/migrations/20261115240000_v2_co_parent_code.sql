-- V2 Phase 7 onboarding step 8 (co-parent, optional): the family's owner makes a one-time code and shares it in person;
-- the other parent enters it in the app to join as a co_parent. The code is stored only as a hash, expires after 48 hours,
-- and a person who keeps getting it wrong is slowed down (ten wrong codes in an hour).

create table if not exists public.co_parent_codes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  code_hash text not null unique,
  created_by uuid,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.co_parent_codes enable row level security;
revoke all on public.co_parent_codes from anon, authenticated;

create or replace function public.create_co_parent_code(_family uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  _code text;
  _person uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not is_household_owner(_family) then raise exception 'Only a parent can make a code.'; end if;
  -- 40 random bits, shown as XXXX-XXXX. Only the hash is kept.
  _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  select id into _person from people where user_id = auth.uid();
  insert into co_parent_codes (family_id, code_hash, created_by, expires_at)
    values (_family, encode(sha256(convert_to(_code, 'UTF8')), 'hex'), _person, now() + interval '48 hours');
  insert into audit_log (actor_kind, actor_id, action, family_id) values ('parent', _person::text, 'co_parent_code_made', _family);
  return _code;
end;
$$;

create or replace function public.redeem_co_parent_code(_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
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
    raise exception 'That code is not right, or it has expired. Ask your co-parent for a new one.';
  end if;

  if not exists (select 1 from families where id = _row.family_id and status = 'active') then
    raise exception 'This family is not set up yet.';
  end if;
  if exists (select 1 from household_members where family_id = _row.family_id and person_id = _person and status = 'active') then
    raise exception 'You already belong to this family.';
  end if;

  update co_parent_codes set used_at = now() where id = _row.id and used_at is null;
  insert into household_members (family_id, person_id, role, status) values (_row.family_id, _person, 'co_parent', 'active');
  insert into audit_log (actor_kind, actor_id, action, family_id) values ('parent', _person::text, 'co_parent_joined', _row.family_id);
  return _row.family_id;
end;
$$;

revoke execute on function public.create_co_parent_code(uuid) from public, anon;
revoke execute on function public.redeem_co_parent_code(text) from public, anon;
grant execute on function public.create_co_parent_code(uuid) to authenticated, service_role;
grant execute on function public.redeem_co_parent_code(text) to authenticated, service_role;
