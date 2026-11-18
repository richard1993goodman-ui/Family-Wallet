-- Family Wallet V2: deleting an account from the app (18 Nov). App stores require that an account made in an app can
-- be deleted from it. Two steps, each started by the signed-in person:
--
--   1. The owner of a household closes it (request_household_deletion). This is the website's "delete my account"
--      (requestOwnerDeletion in src/lib/lifecycle.server.ts) moved into the database so the app can use it: the wallet
--      locks now, the household has 30 days to download its data, reminders go out, and the daily job deletes it after
--      that. The dates are set by the existing trigger (families_lock_clock) and the deleting is done by the existing
--      purge_family; neither is changed here.
--   2. Anyone deletes their own login (delete_my_account). Co-parents and staff can do it at any time: the household
--      and its records stay with the family. An owner can do it once their household is closing or locked, so the 30
--      days to download are never lost by a slip.
--
-- The one household this deletes straight away is one still being set up: never opened, and nobody in it but its owner.

-- The owner (not a co-parent: agreed 14 Nov) closes their household. The family name must be typed, as on the website.
-- Returns the date after which the household is deleted.
create or replace function public.request_household_deletion(_family uuid, _typed_name text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  _person uuid;
  _name text;
  _status text;
  _typed text := lower(regexp_replace(btrim(coalesce(_typed_name, '')), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  select p.id into _person from people p join household_members m on m.person_id = p.id
   where p.user_id = auth.uid() and m.family_id = _family and m.role = 'owner' and m.status = 'active';
  if _person is null then raise exception 'Only the household''s owner can delete it.'; end if;

  select family_name, status into _name, _status from families where id = _family for update;
  -- The same check as the website's deletionConfirmed: the family name, ignoring case and extra spaces.
  if _typed = '' or _typed <> lower(regexp_replace(btrim(_name), '\s+', ' ', 'g')) then
    raise exception 'Type your family name exactly to confirm.';
  end if;

  if _status = 'active' then
    update families set status = 'cancelled', updated_at = now() where id = _family; -- the lock clock sets the dates
    insert into audit_log (actor_kind, actor_id, action, family_id) values ('parent', _person::text, 'deletion_requested', _family);
  elsif _status not in ('cancelled', 'suspended') then
    raise exception 'This household has not been opened yet. Delete your account instead.';
  end if;
  return (select delete_after from families where id = _family);
end $$;

-- When a household that is closing will be deleted, for the people in it (the app shows the date on its lock screen).
-- Null for any other household, and for anyone outside it.
create or replace function public.household_closing(_family uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select f.delete_after from families f
   where f.id = _family and f.status = 'cancelled' and household_side(_family) is not null
$$;

-- The signed-in person deletes their own login: their memberships, their purchase records, their name and photo
-- reference, and the login itself. What the household recorded (logs, timesheets, a staff member's profile and
-- documents) stays with the household. The app signs the phone out afterwards.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _person uuid;
  _open text;
  _fam uuid;
begin
  if _uid is null then raise exception 'Please sign in first.'; end if;
  select id into _person from people where user_id = _uid;

  if _person is not null then
    -- An owner closes their household first, so its 30 days to download are not lost by accident.
    select f.family_name into _open from household_members m join families f on f.id = m.family_id
     where m.person_id = _person and m.role = 'owner' and m.status = 'active' and f.status = 'active' limit 1;
    if _open is not null then
      raise exception 'You own %''s wallet. Delete the household first, then your account.', _open;
    end if;

    -- A household still being set up (never opened, nobody in it but its owner) goes with its owner.
    for _fam in
      select f.id from household_members m join families f on f.id = m.family_id
       where m.person_id = _person and m.role = 'owner' and f.status = 'onboarding'
         and not exists (select 1 from household_members o where o.family_id = f.id and o.person_id is not null and o.person_id <> _person)
    loop
      perform purge_family(_fam, 'owner_deleted_account_during_setup');
    end loop;

    -- One line per household left, with no name in it: the person's id stops meaning anything once they are gone.
    insert into audit_log (actor_kind, actor_id, action, family_id)
      select case when m.role = 'staff' then 'nanny' else 'parent' end, _person::text, 'account_deleted', m.family_id
        from household_members m where m.person_id = _person;
    if not found then
      insert into audit_log (actor_kind, actor_id, action) values ('parent', _person::text, 'account_deleted');
    end if;

    update household_members set revoked_by = null where revoked_by = _person;
    -- Removed, not marked ended: a staff profile can then be given a fresh invite code later.
    delete from household_members where person_id = _person;
    delete from entitlements where person_id = _person;
    delete from people where id = _person;
  end if;

  -- The login itself. The phones registered for alerts go with it (app_push_tokens cascades).
  delete from auth.users where id = _uid;
end $$;

revoke all on function public.request_household_deletion(uuid, text), public.household_closing(uuid), public.delete_my_account() from public, anon;
grant execute on function public.request_household_deletion(uuid, text), public.household_closing(uuid), public.delete_my_account() to authenticated;
