-- V2 Bank details (plan 5j, agreed 15 Nov). Test copy first; live only with approval. Additive: two new functions.
-- Reading is unchanged ("Members read bank details": parents, and that nanny her own row). Writing was website-only
-- (master key); these let the signed-in nanny save or remove her own row, with the website's checks and lengths
-- (src/lib/bank-details.types.ts). Parents never write a nanny's bank details.

create or replace function public.save_bank_details(_family uuid, _account_name text, _bank_name text, _sort_code text,
  _account_number text, _iban text, _swift text, _payment_reference text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare me uuid := my_staff_nanny(_family);
  n text := trim(coalesce(_account_name, '')); b text := trim(coalesce(_bank_name, '')); s text := trim(coalesce(_sort_code, ''));
  a text := trim(coalesce(_account_number, '')); i text := trim(coalesce(_iban, '')); w text := trim(coalesce(_swift, ''));
  r text := trim(coalesce(_payment_reference, ''));
begin
  if me is null then raise exception 'Only the nanny can add their own bank details'; end if;
  if n = '' then raise exception 'Add the name on the account.'; end if;
  if a = '' and i = '' then raise exception 'Add an account number or IBAN.'; end if;
  if length(n) > 120 or length(b) > 120 or length(s) > 20 or length(a) > 34 or length(i) > 40 or length(w) > 20 or length(r) > 120 then
    raise exception 'One of the details is too long'; end if;
  insert into nanny_bank_details (family_id, nanny_id, account_name, bank_name, sort_code, account_number, iban, swift, payment_reference, updated_at)
    values (_family, me, n, nullif(b, ''), nullif(s, ''), nullif(a, ''), nullif(i, ''), nullif(w, ''), nullif(r, ''), now())
  on conflict (family_id, nanny_id) do update set account_name = excluded.account_name, bank_name = excluded.bank_name,
    sort_code = excluded.sort_code, account_number = excluded.account_number, iban = excluded.iban, swift = excluded.swift,
    payment_reference = excluded.payment_reference, updated_at = now();
end $$;

create or replace function public.remove_bank_details(_family uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare me uuid := my_staff_nanny(_family);
begin
  if me is null then raise exception 'Only the nanny can remove their own bank details'; end if;
  delete from nanny_bank_details where family_id = _family and nanny_id = me;
end $$;

revoke execute on function public.save_bank_details(uuid, text, text, text, text, text, text, text) from public, anon;
revoke execute on function public.remove_bank_details(uuid) from public, anon;
grant execute on function public.save_bank_details(uuid, text, text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.remove_bank_details(uuid) to authenticated, service_role;
