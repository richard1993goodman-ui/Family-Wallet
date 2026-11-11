-- How a household chose to handle its nanny arrangement when it first signed in:
--   template      : the formal employed agreement (or written statement)
--   self_employed : the self-employed services agreement
--   none          : no agreement; the parent sets working hours by hand
-- Null means they have not chosen yet, so the wallet asks on first sign-in.
alter table public.families
  add column if not exists agreement_choice text check (agreement_choice in ('template', 'self_employed', 'none'));

-- Households that already exist keep working as they do today and are not asked again.
update public.families
set agreement_choice = case when use_agreement = false then 'none' else 'template' end
where agreement_choice is null;
