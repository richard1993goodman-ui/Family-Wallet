-- V2 (16 Nov): an agency family joins in the app with the typed backup code from its invitation. The rules match the
-- website's acceptInvite (src/lib/seat-invites.server.ts): the code is one-time (it is cleared the moment it is used),
-- it expires after its 48 hours, and it is stored only as a hash. The family is created agency-funded, so it skips the
-- paywall. An unknown code returns nothing, so the app can then try a family's own join code.

create or replace function public.redeem_agency_code(_code text, _family_name text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _clean_code text := regexp_replace(upper(coalesce(_code, '')), '[^A-Z0-9]', '', 'g');
  _hash text;
  _name text := trim(coalesce(_family_name, ''));
  _person uuid;
  _recent_failures int;
  _invite agency_invites%rowtype;
  _family uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if char_length(_name) < 2 or char_length(_name) > 80 then raise exception 'Enter your family name (2 to 80 characters).'; end if;
  if char_length(_clean_code) <> 8 then return null; end if;
  select id into _person from people where user_id = auth.uid();
  if _person is null then raise exception 'Enter your name first.'; end if;

  -- Typed codes are guessable in principle: ten wrong tries in an hour stops further tries for this person.
  select count(*) into _recent_failures from audit_log
    where actor_id = _person::text and action = 'agency_code_failed' and at > now() - interval '1 hour';
  if _recent_failures >= 10 then raise exception 'Too many wrong codes. Please try again in an hour.'; end if;

  if exists (select 1 from household_members m where m.person_id = _person and m.role = 'owner' and m.status = 'active') then
    raise exception 'You already have a family wallet.';
  end if;

  _hash := encode(sha256(convert_to('invite-code:' || _clean_code, 'UTF8')), 'hex');
  -- One conditional update claims the invitation, so a code can only ever be used once.
  update agency_invites set status = 'accepted', code_hash = null, token_hash = null, accepted_at = now()
    where code_hash = _hash and status = 'pending' and expires_at > now()
    returning * into _invite;
  if _invite.id is null then
    -- Not an agency code: say nothing here, the app tries the family join code next.
    -- Only a wrong attempt that matches no code at all is counted.
    if not exists (select 1 from agency_invites where code_hash = _hash) then
      insert into audit_log (actor_kind, actor_id, action) values ('parent', _person::text, 'agency_code_failed');
    end if;
    return null;
  end if;

  insert into families (slug, family_name, contact_email, access_code_hash, status, country, region, time_zone, currency,
                        onboarding_step, entitlement, partner_agency_id)
    values ('family-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10), _name,
      case when _invite.email like '%.invalid' then null else _invite.email end,
      'agency-' || md5(random()::text), 'active', 'GB', null, 'Europe/London', 'GBP', 4, 'agency_active', _invite.agency_id)
    returning id into _family;
  insert into household_members (family_id, person_id, role, status) values (_family, _person, 'owner', 'active');
  update agency_invites set family_id = _family where id = _invite.id;
  insert into audit_log (actor_kind, actor_id, action, family_id)
    values ('parent', _person::text, 'agency_code_redeemed', _family);
  return _family;
end;
$$;

revoke all on function public.redeem_agency_code(text, text) from public, anon;
grant execute on function public.redeem_agency_code(text, text) to authenticated;
