-- V2 (decided 16 Nov): the app no longer writes agreements. A parent uploads their own agreement as a staff document
-- (wallet_documents, category 'agreement', added through add_staff_document) and the parent and that staff member sign it.
-- The wallet only stores the file and records who signed and when. Nothing here changes existing tables or rows.

create or replace function public.sign_uploaded_agreement(_document uuid, _name text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare nm text := trim(coalesce(_name, '')); role text; d wallet_documents;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  select * into d from wallet_documents where id = _document and category = 'agreement' and nanny_id is not null;
  if d.id is null then raise exception 'Agreement not found'; end if;
  if is_household_owner(d.family_id) then role := 'parent';
  elsif my_staff_nanny(d.family_id) = d.nanny_id then role := 'nanny';
  else raise exception 'This agreement is not yours to sign'; end if;
  if length(nm) < 3 or length(nm) > 120 then raise exception 'Type your full name to sign.'; end if;
  if exists (select 1 from document_signatures where doc_kind = 'uploaded_agreement' and doc_version = d.id::text and signer_role = role) then
    raise exception 'This agreement has already been signed by the %', role; end if;
  insert into document_signatures (family_id, nanny_id, doc_kind, signer_role, signer_name, doc_version, verified_email, verified_at)
    values (d.family_id, d.nanny_id, 'uploaded_agreement', role, nm, d.id::text, auth.email(), now());
end $$;

revoke all on function public.sign_uploaded_agreement(uuid, text) from public, anon;
grant execute on function public.sign_uploaded_agreement(uuid, text) to authenticated;
