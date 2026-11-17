-- V2 Phase 2: the parent shortcut in the app. Same rule as the website's walletsForEmail / linkWalletByEmail
-- (src/lib/account.server.ts, canLinkByEmail): the login's email is verified, it is the family's contact email,
-- the wallet is active, and its single owner place has no login yet. Never lets anyone take over a claimed wallet.

create or replace function public.my_wallet_offers()
returns table (family_id uuid, family_name text)
language sql stable security definer set search_path = public as $$
  select f.id, f.family_name
  from families f
  join auth.users u on u.id = auth.uid()
  where u.email_confirmed_at is not null
    and lower(trim(f.contact_email)) = lower(trim(u.email))
    and f.status = 'active'
    -- At most one owner place, and it has no login (none at all: the claim adds it, as the website does).
    and (select count(*) from household_members m where m.family_id = f.id and m.role = 'owner') <= 1
    and not exists (select 1 from household_members m where m.family_id = f.id and m.role = 'owner' and m.person_id is not null)
  order by f.family_name
  limit 10;
$$;

create or replace function public.claim_my_wallet(_family uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  _member uuid;
  _person uuid;
  _name text;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  -- Serialise claims on this wallet so two logins can't both take it.
  perform 1 from families where id = _family for update;
  select o.family_name into _name from my_wallet_offers() o where o.family_id = _family;
  if _name is null then raise exception 'We couldn''t find a wallet for your email.'; end if;

  select id into _member from household_members where family_id = _family and role = 'owner';
  if _member is null then
    insert into household_members (family_id, role, status) values (_family, 'owner', 'active') returning id into _member;
  end if;

  select id into _person from people where user_id = auth.uid();
  if _person is null then
    insert into people (user_id, display_name) values (auth.uid(), _name) returning id into _person;
  end if;

  update household_members set person_id = _person where id = _member and person_id is null;
  if not found then raise exception 'This wallet already has a login.'; end if;

  insert into audit_log (actor_kind, actor_id, action, family_id) values ('parent', _person::text, 'account_linked_by_email', _family);
end;
$$;

revoke execute on function public.my_wallet_offers() from public, anon;
revoke execute on function public.claim_my_wallet(uuid) from public, anon;
grant execute on function public.my_wallet_offers() to authenticated, service_role;
grant execute on function public.claim_my_wallet(uuid) to authenticated, service_role;
