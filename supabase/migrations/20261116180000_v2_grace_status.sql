-- V2 (16 Nov): lets the app show a household's grace period. Read-only: it adds one function and changes no rows.
-- Only members of the household get an answer; everyone else gets nothing.
-- The rule matches the website (src/lib/entitlement.ts): a wallet released from an agency seat has `transition`
-- and an end date. Days left are counted from the end date. Staff see the same status as parents.

create or replace function public.my_grace_status(_family uuid)
returns table (entitlement text, transition_ends_at timestamptz, days_left integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  select f.entitlement,
         f.transition_ends_at,
         case when f.transition_ends_at is null then null
              else greatest(0, ceil(extract(epoch from (f.transition_ends_at - now())) / 86400))::integer end
    from families f
   where f.id = _family
     and household_side(_family) is not null
$$;

revoke all on function public.my_grace_status(uuid) from public, anon;
grant execute on function public.my_grace_status(uuid) to authenticated;
