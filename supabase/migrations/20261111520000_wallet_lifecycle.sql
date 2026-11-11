-- Lock, export and delete lifecycle. A wallet that goes from active to suspended or cancelled is locked at once and has
-- 30 days before it can be deleted. This migration only adds the clock, a hold switch and the purge function: nothing is
-- deleted by it, and existing wallets are not touched (all current wallets are active).

alter table public.families
  add column if not exists locked_at timestamptz,
  add column if not exists delete_after timestamptz,
  -- Set by the owner to stop a deletion, for a dispute or a request to keep the wallet.
  add column if not exists deletion_hold boolean not null default false,
  -- Which reminder emails have gone out (days after locking), so none is sent twice.
  add column if not exists deletion_notices jsonb not null default '[]'::jsonb,
  -- The owner has confirmed a locked wallet with no email address may be deleted.
  add column if not exists deletion_confirmed boolean not null default false;

-- The clock starts whenever a status change locks the wallet, whichever part of the app made the change, and stops
-- if the wallet becomes active again. Moving between suspended and cancelled does not restart it.
create or replace function public.families_lock_clock() returns trigger
language plpgsql as $$
begin
  if new.status in ('suspended', 'cancelled') and old.status = 'active' then
    new.locked_at := now();
    new.delete_after := now() + interval '30 days';
    new.deletion_notices := '[]'::jsonb;
    new.deletion_confirmed := false;
  elsif new.status = 'active' and old.status in ('suspended', 'cancelled') then
    new.locked_at := null;
    new.delete_after := null;
    new.deletion_notices := '[]'::jsonb;
    new.deletion_confirmed := false;
  end if;
  return new;
end $$;

drop trigger if exists families_lock_clock on public.families;
create trigger families_lock_clock before update on public.families
  for each row when (old.status is distinct from new.status) execute function public.families_lock_clock();

-- What remains after a household is deleted: that it existed and when it went, and nothing about who they were.
create table if not exists public.deleted_households (
  family_id uuid primary key,
  deleted_at timestamptz not null default now(),
  reason text not null,
  was_agency_funded boolean not null default false
);
alter table public.deleted_households enable row level security;

-- Permanently deletes one household's database records, in an order that clears the append-only history first.
-- It runs with its owner's rights (the history tables refuse deletes to everyone else) and only the server can call it.
-- Files in storage and orphaned account logins are removed by the application before and after this runs.
create or replace function public.purge_family(_family uuid, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare funded boolean;
begin
  select partner_agency_id is not null into funded from public.families where id = _family;
  if not found then raise exception 'That household does not exist.'; end if;

  delete from public.document_signatures where family_id = _family;
  delete from public.agreement_versions where family_id = _family;
  delete from public.nanny_agreements where family_id = _family;

  -- Records kept for the agency's seat count and the payment history lose the personal details they held.
  update public.agency_invites set email = 'deleted-' || substr(id::text, 1, 8) || '@seat.invalid', nanny_email = null, nanny_name = null where family_id = _family;
  update public.family_subscriptions set customer_email = null where family_id = _family;

  delete from public.families where id = _family;
  insert into public.deleted_households (family_id, reason, was_agency_funded) values (_family, _reason, coalesce(funded, false));
end $$;

revoke all on function public.purge_family(uuid, text) from public, anon, authenticated;
grant execute on function public.purge_family(uuid, text) to service_role;
