-- V2 Groceries (new app feature, agreed 14 Nov 2026, plan section 5g). Test copy first; live only with approval.
-- One shared shopping list. Buying with your own money adds an expense in the same step (buy_groceries).
-- The website doesn't show this table; it does show the expenses, which go in the existing expense_claims table.

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  note text not null default '' check (char_length(note) <= 200),
  added_by text not null check (added_by in ('family', 'nanny')),
  added_by_name text check (char_length(added_by_name) <= 120),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  bought_at timestamptz,
  bought_by uuid,
  bought_by_name text,
  -- The amount lives on the expense, so only parents and the person who paid can see it (expense rules).
  expense_id uuid references public.expense_claims(id) on delete set null
);
create index grocery_items_family_bought on public.grocery_items (family_id, bought_at);

alter table public.grocery_items enable row level security;
revoke all on public.grocery_items from anon, authenticated;
grant select, delete on public.grocery_items to authenticated;
grant insert (family_id, name, note, added_by, added_by_name) on public.grocery_items to authenticated;

create policy "Members read" on public.grocery_items for select to authenticated using (public.is_household_member(family_id));
create policy "Members add own" on public.grocery_items for insert to authenticated
  with check (public.is_household_member(family_id) and created_by = auth.uid() and added_by = public.household_side(family_id));
-- Still-needed items only: your own, or any if you're a parent. Bought items stay (they may be tied to an expense).
create policy "Own or parent remove needed" on public.grocery_items for delete to authenticated
  using (bought_at is null and (public.is_household_owner(family_id) or (public.is_household_member(family_id) and created_by = auth.uid())));

-- Tick items off. With an amount (staff only), also add one pending Food/snacks expense in the buyer's name.
-- Returns the new expense's id, or null when there was no amount.
create or replace function public.buy_groceries(_ids uuid[], _amount numeric default null)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare fam uuid; n int; fams int; who text; nanny uuid; names text; exp uuid; tz text; cur text;
begin
  -- Every item must exist, still be needed, and belong to one household the caller is in.
  select count(*), count(distinct family_id), min(family_id::text)::uuid into n, fams, fam
    from grocery_items where id = any(_ids) and bought_at is null;
  if n = 0 or n <> cardinality(_ids) or fams <> 1 or not is_household_member(fam) then
    raise exception 'Those items are not on your list';
  end if;
  select display_name into who from people where user_id = auth.uid();
  if _amount is not null then
    nanny := my_staff_nanny(fam);
    if nanny is null then raise exception 'Only staff add a grocery expense'; end if;
    if _amount <= 0 or _amount > 10000 then raise exception 'Amount must be more than 0 and up to 10,000'; end if;
    select string_agg(name, ', ' order by created_at) into names from grocery_items where id = any(_ids);
    select time_zone, currency into tz, cur from families where id = fam;
    insert into expense_claims (family_id, nanny_id, expense_date, item, amount, currency, category, status, submitted_by, submitted_by_name)
      values (fam, nanny, (now() at time zone coalesce(tz, 'Europe/London'))::date, left('Groceries: ' || names, 200),
        round(_amount, 2), coalesce(cur, 'GBP'), 'food', 'pending', 'nanny', who)
      returning id into exp;
  end if;
  update grocery_items set bought_at = now(), bought_by = auth.uid(), bought_by_name = who, expense_id = exp where id = any(_ids);
  return exp;
end $$;

revoke execute on function public.buy_groceries(uuid[], numeric) from public, anon;
grant execute on function public.buy_groceries(uuid[], numeric) to authenticated, service_role;
