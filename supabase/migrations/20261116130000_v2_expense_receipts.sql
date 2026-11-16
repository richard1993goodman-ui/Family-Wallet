-- Expenses quick log (16 Nov, approved by the owner): a receipt photo on an expense, and which children it was for
-- (empty means the whole household). Receipts sit in family-docs under receipts/<family>/ and are read through the
-- expense that points at them, so the existing expense rules decide who sees one (parents all, staff their own).
alter table public.expense_claims add column if not exists receipt_path text;
alter table public.expense_claims add column if not exists child_ids uuid[] not null default '{}';

create policy "Members upload expense receipts" on storage.objects for insert to authenticated with check (
  bucket_id = 'family-docs'
  and (storage.foldername(name))[1] = 'receipts'
  and case when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_household_member(((storage.foldername(name))[2])::uuid) else false end
);

create policy "Read receipts of expenses you can see" on storage.objects for select to authenticated using (
  bucket_id = 'family-docs'
  and (storage.foldername(name))[1] = 'receipts'
  and exists (select 1 from public.expense_claims e where e.receipt_path = objects.name
    and (storage.foldername(objects.name))[2] = e.family_id::text and public.is_household_member(e.family_id))
);
