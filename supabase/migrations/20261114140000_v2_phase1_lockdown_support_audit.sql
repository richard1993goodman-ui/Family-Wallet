-- V2 Phase 1: shut out signed-out visitors, support access only by a family's grant, protect the audit log.
-- Test copy first; live only with approval. V1 uses the service key for all data and files, so the website is unaffected.

-- ---------- 1. Support access: nobody by default ----------
-- The team could read every family's files through an admin rule; that goes. Team access now needs a family's grant.
drop policy if exists "Admins manage family docs storage" on storage.objects;

create table public.support_access_grants (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  granted_by uuid not null default auth.uid(),
  reason text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index support_access_grants_family_idx on public.support_access_grants (family_id, expires_at desc);
alter table public.support_access_grants enable row level security;

-- Parents grant and withdraw; the team reads grants only through the server (service key), which logs each use.
revoke all on public.support_access_grants from anon, authenticated;
grant select on public.support_access_grants to authenticated;
grant insert (family_id, reason, expires_at) on public.support_access_grants to authenticated;
grant update (revoked_at) on public.support_access_grants to authenticated;
create policy "Parents read" on public.support_access_grants for select to authenticated using (public.is_household_owner(family_id));
create policy "Parents grant" on public.support_access_grants for insert to authenticated
  with check (public.is_household_owner(family_id) and granted_by = auth.uid() and expires_at > now());
create policy "Parents withdraw" on public.support_access_grants for update to authenticated
  using (public.is_household_owner(family_id)) with check (public.is_household_owner(family_id));

-- ---------- 2. Audit log ----------
-- A team member acting under a family's grant is recorded as 'support'.
alter table public.audit_log drop constraint audit_log_actor_kind_check;
alter table public.audit_log add constraint audit_log_actor_kind_check
  check (actor_kind = any (array['owner', 'agency_staff', 'parent', 'nanny', 'system', 'webhook', 'support']));

-- Every grant and withdrawal is logged by the database itself, whoever makes it.
create function public.log_support_grant() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.audit_log (actor_kind, actor_id, action, family_id, meta)
  values (case when auth.uid() is null then 'system' else 'parent' end, auth.uid()::text,
          case when tg_op = 'INSERT' then 'support_access.granted'
               when new.revoked_at is not null and old.revoked_at is null then 'support_access.withdrawn'
               else 'support_access.changed' end,
          new.family_id, jsonb_build_object('grant_id', new.id, 'expires_at', new.expires_at));
  return new;
end $$;
create trigger log_support_grant after insert or update on public.support_access_grants
  for each row execute function public.log_support_grant();

-- Entries can be added, never edited or removed (the service key included).
-- shortcut: retention clean-up will need this trigger lifted inside its own job, once the solicitor sets periods.
create function public.audit_log_append_only() returns trigger language plpgsql as $$
begin raise exception 'The audit log cannot be changed or deleted.'; end $$;
create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function public.audit_log_append_only();

-- ---------- 3. Signed-out visitors ----------
-- Rules already returned nothing to them; now they cannot reach the tables or functions at all.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
-- Functions: as on live, helpers are for signed-in people only and the purge is server-only.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role), public.is_household_member(uuid),
  public.is_household_owner(uuid), public.my_staff_nanny(uuid), public.household_side(uuid),
  public.get_partner_brand(text), public.get_partner_logo(text) to authenticated;
grant execute on all functions in schema public to service_role;
