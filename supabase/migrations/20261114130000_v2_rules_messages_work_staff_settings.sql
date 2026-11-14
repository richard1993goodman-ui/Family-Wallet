-- V2 access rules, groups 3 (messages), 4 (work and money), 5 (staff records), 6 (personal app settings).
-- Agreed 14 Nov 2026: family-wallet-v2-access-rules.md (decision 2: staff see only their own pay, leave and hours).
-- Additive only: V1 uses the service key, which ignores these rules. Needs 20261114120000 (household_side).

-- Which staff member a timesheet belongs to; who started a support thread; whose phone an alert goes to.
alter table public.timesheet_shifts add column if not exists nanny_id uuid references public.family_nannies(id) on delete set null;
create index if not exists timesheet_shifts_nanny_idx on public.timesheet_shifts (nanny_id);
alter table public.support_threads add column if not exists created_by uuid default auth.uid();
alter table public.push_subscriptions add column if not exists user_id uuid default auth.uid();

-- ---------- 3. Messages ----------
create policy "Members read" on public.household_threads for select to authenticated using (public.is_household_member(family_id));
create policy "Members start" on public.household_threads for insert to authenticated
  with check (created_by = public.household_side(family_id) and last_sender = created_by);
-- Sending a message updates only who spoke last and the unread flags.
revoke update on public.household_threads from anon, authenticated;
grant update (last_sender, family_unread, nanny_unread, updated_at) on public.household_threads to authenticated;
create policy "Members mark" on public.household_threads for update to authenticated
  using (public.is_household_member(family_id)) with check (last_sender = public.household_side(family_id));

create policy "Members read" on public.household_messages for select to authenticated
  using (exists (select 1 from public.household_threads t where t.id = thread_id and public.is_household_member(t.family_id)));
create policy "Members send" on public.household_messages for insert to authenticated
  with check (exists (select 1 from public.household_threads t where t.id = thread_id and sender = public.household_side(t.family_id)));

-- Messages with the Family Wallet team: parents see the household's, staff see the ones they started. Team replies via the server.
create policy "Parents or starter read" on public.support_threads for select to authenticated
  using (public.is_household_owner(family_id) or (public.is_household_member(family_id) and created_by = auth.uid()));
create policy "Members start" on public.support_threads for insert to authenticated
  with check (public.is_household_member(family_id) and created_by = auth.uid() and last_sender = public.household_side(family_id));
create policy "Parents or starter read" on public.support_messages for select to authenticated
  using (exists (select 1 from public.support_threads t where t.id = thread_id
    and (public.is_household_owner(t.family_id) or (public.is_household_member(t.family_id) and t.created_by = auth.uid()))));
create policy "Parents or starter send" on public.support_messages for insert to authenticated
  with check (exists (select 1 from public.support_threads t where t.id = thread_id
    and sender = public.household_side(t.family_id)
    and (public.is_household_owner(t.family_id) or t.created_by = auth.uid())));

-- ---------- 4. Work and money ----------
-- Parents see everyone's; staff see only their own. Staff submit as pending; parents approve through the server.
do $$ declare r record; begin
  for r in select * from (values ('timesheet_shifts', 'submitted_by', 'status'), ('expense_claims', 'submitted_by', 'status'),
    ('leave_requests', 'requested_by', 'status')) v(t, who, st) loop
    execute format('create policy "Parents or own read" on public.%I for select to authenticated using (public.is_household_owner(family_id) or nanny_id = public.my_staff_nanny(family_id))', r.t);
    execute format('create policy "Staff submit own" on public.%I for insert to authenticated with check (nanny_id = public.my_staff_nanny(family_id) and %I = ''nanny'' and %I = ''pending'')', r.t, r.who, r.st);
    execute format('create policy "Parents add" on public.%I for insert to authenticated with check (public.is_household_owner(family_id) and %I = ''family'')', r.t, r.who);
  end loop;
end $$;

create policy "Parents or own read" on public.nanny_work_hours for select to authenticated
  using (public.is_household_owner(family_id) or nanny_id = public.my_staff_nanny(family_id));
create policy "Parents add" on public.nanny_work_hours for insert to authenticated with check (public.is_household_owner(family_id));
create policy "Parents change" on public.nanny_work_hours for update to authenticated using (public.is_household_owner(family_id)) with check (public.is_household_owner(family_id));
create policy "Parents remove" on public.nanny_work_hours for delete to authenticated using (public.is_household_owner(family_id));

-- Petty cash is a shared household float: everyone sees it; staff record spends, parents also top up.
create policy "Members read" on public.petty_cash_entries for select to authenticated using (public.is_household_member(family_id));
create policy "Members add" on public.petty_cash_entries for insert to authenticated
  with check (added_by = public.household_side(family_id) and (added_by = 'family' or kind = 'spend'));

-- Live-in weeks have no per-person column (one live-in helper per home): household reads, parents change.
create policy "Members read" on public.live_in_weeks for select to authenticated using (public.is_household_member(family_id));
create policy "Parents add" on public.live_in_weeks for insert to authenticated with check (public.is_household_owner(family_id));
create policy "Parents change" on public.live_in_weeks for update to authenticated using (public.is_household_owner(family_id)) with check (public.is_household_owner(family_id));

-- ---------- 5. Staff records ----------
-- family_nannies holds login codes and insurance numbers, so the table stays closed; the app reads views.
-- Colleagues: name, photo and role only.
create view public.household_staff with (security_barrier) as
  select id, family_id, name, photo_path, role, status, sort_order, last_seen_at
  from public.family_nannies where public.is_household_member(family_id);
-- Full profile (never codes): parents see all their staff, staff see their own.
create view public.staff_profiles with (security_barrier) as
  select id, family_id, name, bio, photo_path, role, status, sort_order, emergency_name, emergency_relationship,
         emergency_phone, insurance_provider, insurance_policy_number, insurance_cover_from, insurance_cover_until,
         invited_at, created_at, updated_at, last_seen_at
  from public.family_nannies where public.is_household_owner(family_id) or id = public.my_staff_nanny(family_id);
-- Safety checks: colleagues see only which checks are in date, never the documents.
create view public.staff_checks with (security_barrier) as
  select nanny_id, family_id, document_type, expires_on
  from public.nanny_safety_documents where public.is_household_member(family_id);
revoke all on public.household_staff, public.staff_profiles, public.staff_checks from anon, authenticated;
grant select on public.household_staff, public.staff_profiles, public.staff_checks to authenticated;

-- Parents see all; staff see their own. Uploads, signing and review answers go through the server.
do $$ declare t text; begin
  foreach t in array array['nanny_safety_documents', 'nanny_agreements', 'agreement_versions', 'document_signatures', 'review_checkins'] loop
    execute format('create policy "Parents or own read" on public.%I for select to authenticated using (public.is_household_owner(family_id) or nanny_id = public.my_staff_nanny(family_id))', t);
  end loop;
end $$;

-- ---------- 6. Personal app settings ----------
create policy "Own alerts" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid() and public.is_household_member(family_id))
  with check (user_id = auth.uid() and role = public.household_side(family_id));
create policy "Own side seen" on public.wallet_seen for all to authenticated
  using (role = public.household_side(family_id)) with check (role = public.household_side(family_id));
create policy "Members read" on public.wallet_activity for select to authenticated using (public.is_household_member(family_id));
