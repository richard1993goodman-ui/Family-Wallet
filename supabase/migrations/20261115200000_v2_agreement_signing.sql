-- V2 Agreement: read and sign (plan 5l, agreed 15 Nov). Test copy first; live only with approval. Additive: two new functions.
-- Reading is unchanged ("Parents or own read"). Writing, issuing, AI drafting and the PDF stay on the website (Phase 9).
-- sign_agreement does the website's checks (src/lib/agreement.server.ts signDocument): issued, unchanged since issue,
-- parent signs as parent, the agreement's own nanny as nanny, name at least 3 characters. The signed-in account's email is
-- recorded as verified, as the website does for signed-in people. No PDF copy is made here (gap accepted until Phase 9).

-- Same rule as the website's resolveAgreementMode: the agency's choice for the family, then the agency-wide switch, then the parents'.
create or replace function public.agreement_on(_family uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select is_household_member(_family) and case f.agreement_policy
      when 'on' then true when 'off' then false
      else coalesce(a.agreements_enabled, true) and f.use_agreement end
  from families f left join partner_agencies a on a.id = f.partner_agency_id
  where f.id = _family
$$;

create or replace function public.sign_agreement(_family uuid, _name text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare nm text := trim(coalesce(_name, '')); role text; ag nanny_agreements; v agreement_versions;
begin
  if is_household_owner(_family) then role := 'parent';
  elsif my_staff_nanny(_family) is not null then role := 'nanny';
  else raise exception 'Not part of this household'; end if;
  if not coalesce(agreement_on(_family), false) then raise exception 'Agreements are switched off for this household'; end if;
  if length(nm) < 3 or length(nm) > 120 then raise exception 'Type your full name to sign.'; end if;
  select * into ag from nanny_agreements where family_id = _family;
  if ag.id is null or ag.status <> 'issued' then raise exception 'There is no issued agreement to sign yet.'; end if;
  if role = 'nanny' and ag.nanny_id is distinct from my_staff_nanny(_family) then raise exception 'This agreement is for another nanny'; end if;
  select * into v from agreement_versions where agreement_id = ag.id and version = ag.version;
  if v.id is null or v.snapshot_text::jsonb <> ag.agreement_data then
    raise exception 'The agreement has changed since it was issued. It needs to be issued again on the website before anyone signs.'; end if;
  if exists (select 1 from document_signatures where agreement_version_id = v.id and signer_role = role) then
    raise exception 'This version has already been signed by the %', role; end if;
  insert into document_signatures (family_id, nanny_id, doc_kind, signer_role, signer_name, doc_version, agreement_version_id,
      content_hash, verified_email, verified_at)
    values (_family, ag.nanny_id, 'agreement', role, nm, ag.version::text, v.id, v.content_hash, auth.email(), now());
end $$;

revoke execute on function public.agreement_on(uuid) from public, anon;
revoke execute on function public.sign_agreement(uuid, text) from public, anon;
grant execute on function public.agreement_on(uuid) to authenticated, service_role;
grant execute on function public.sign_agreement(uuid, text) to authenticated, service_role;
