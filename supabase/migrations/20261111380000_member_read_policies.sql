-- Stage C5: database-level read rules for the most sensitive household tables, for people signed in with their
-- own account. Read-only: there are no insert, update or delete policies, so every write still goes through the
-- server. Code-login sessions are unaffected (they use the server's service key, as before).

-- Helpers. Security definer so they can read memberships without tripping the memberships' own row rules.
create or replace function public.is_household_owner(_family uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members m join public.people p on p.id = m.person_id
    where m.family_id = _family and p.user_id = auth.uid() and m.status = 'active' and m.role in ('owner', 'co_parent')
  )
$$;

create or replace function public.my_staff_nanny(_family uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select m.nanny_id from public.household_members m join public.people p on p.id = m.person_id
  where m.family_id = _family and p.user_id = auth.uid() and m.status = 'active' and m.role = 'staff'
  limit 1
$$;

create or replace function public.is_household_member(_family uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_household_owner(_family) or public.my_staff_nanny(_family) is not null
$$;

revoke all on function public.is_household_owner(uuid), public.my_staff_nanny(uuid), public.is_household_member(uuid) from public, anon;
grant execute on function public.is_household_owner(uuid), public.my_staff_nanny(uuid), public.is_household_member(uuid) to authenticated;

grant select on public.wallet_documents, public.nanny_bank_details, public.house_manual_entries, public.incident_reports to authenticated;

-- Document vault: the household sees everything; a staff member sees their own documents and the household
-- documents shared with staff.
drop policy if exists "Members read vault documents" on public.wallet_documents;
create policy "Members read vault documents" on public.wallet_documents for select to authenticated using (
  public.is_household_owner(family_id)
  or (public.my_staff_nanny(family_id) is not null
      and (nanny_id = public.my_staff_nanny(family_id) or (nanny_id is null and shared_with_staff)))
);

-- Bank details: the household, and the staff member they belong to. Never another staff member.
drop policy if exists "Members read bank details" on public.nanny_bank_details;
create policy "Members read bank details" on public.nanny_bank_details for select to authenticated using (
  public.is_household_owner(family_id) or nanny_id = public.my_staff_nanny(family_id)
);

-- House manual (including door and alarm codes) and incident reports: everyone in the household.
drop policy if exists "Members read house manual" on public.house_manual_entries;
create policy "Members read house manual" on public.house_manual_entries for select to authenticated using (public.is_household_member(family_id));
drop policy if exists "Members read incident reports" on public.incident_reports;
create policy "Members read incident reports" on public.incident_reports for select to authenticated using (public.is_household_member(family_id));

-- Vault files: readable only when the person can already see the matching vault row (row rules apply inside the check).
drop policy if exists "Members read their vault files" on storage.objects;
create policy "Members read their vault files" on storage.objects for select to authenticated using (
  bucket_id = 'family-docs' and exists (select 1 from public.wallet_documents d where d.storage_path = storage.objects.name)
);
