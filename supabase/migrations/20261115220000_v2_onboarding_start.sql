-- V2 Phase 7 (first part): a new parent starts their own family from the app. Steps 2 and 4 of the agreed onboarding
-- (name; family details). Payment (step 3) comes next, so the family stays in status 'onboarding' until then.
-- Only a signed-in person can use these; each person can own one unfinished family at a time.

alter table families add column if not exists onboarding_step integer;

create or replace function public.set_my_display_name(_name text)
returns void
language plpgsql security definer set search_path = public as $$
declare _clean text := trim(coalesce(_name, ''));
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if char_length(_clean) < 2 or char_length(_clean) > 80 then raise exception 'Enter your name (2 to 80 characters).'; end if;
  insert into people (user_id, display_name) values (auth.uid(), _clean)
    on conflict (user_id) do update set display_name = excluded.display_name;
end;
$$;

create or replace function public.start_family_onboarding(_family_name text, _country text, _region text, _time_zone text, _currency text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  _person uuid;
  _family uuid;
  _email text;
  _clean text := trim(coalesce(_family_name, ''));
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if char_length(_clean) < 2 or char_length(_clean) > 80 then raise exception 'Enter a family name (2 to 80 characters).'; end if;
  if coalesce(_currency, '') !~ '^[A-Z]{3}$' then raise exception 'Choose a currency.'; end if;
  if coalesce(_time_zone, '') = '' or coalesce(_country, '') = '' then raise exception 'Choose a country and time zone.'; end if;

  select id into _person from people where user_id = auth.uid();
  if _person is null then raise exception 'Enter your name first.'; end if;

  -- One unfinished family at a time: carry on with it rather than starting another.
  select f.id into _family
  from families f join household_members m on m.family_id = f.id
  where m.person_id = _person and m.role = 'owner' and f.status = 'onboarding'
  limit 1;

  if _family is not null then
    update families set family_name = _clean, country = _country, region = _region, time_zone = _time_zone, currency = _currency,
      onboarding_step = greatest(coalesce(onboarding_step, 0), 4), updated_at = now()
    where id = _family;
    return _family;
  end if;

  if exists (
    select 1 from household_members m where m.person_id = _person and m.role = 'owner' and m.status = 'active'
  ) then raise exception 'You already have a family wallet.'; end if;

  _email := lower(trim(coalesce((select email from auth.users where id = auth.uid()), '')));
  insert into families (slug, family_name, contact_email, access_code_hash, status, country, region, time_zone, currency, onboarding_step)
    values ('family-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10), _clean, nullif(_email, ''),
      'onboarding-' || md5(random()::text), 'onboarding', _country, _region, _time_zone, _currency, 4)
    returning id into _family;
  insert into household_members (family_id, person_id, role, status) values (_family, _person, 'owner', 'active');

  insert into audit_log (actor_kind, actor_id, action, family_id) values ('parent', _person::text, 'family_onboarding_started', _family);
  return _family;
end;
$$;

revoke execute on function public.set_my_display_name(text) from public, anon;
revoke execute on function public.start_family_onboarding(text, text, text, text, text) from public, anon;
grant execute on function public.set_my_display_name(text) to authenticated, service_role;
grant execute on function public.start_family_onboarding(text, text, text, text, text) to authenticated, service_role;
