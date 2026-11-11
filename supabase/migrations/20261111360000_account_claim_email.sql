-- The email address a claim link was sent to. The link proves the person controls it.
alter table public.account_claims add column if not exists email text;
