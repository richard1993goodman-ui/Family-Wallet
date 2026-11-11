-- Stage F1: where a household is, and what currency its money is in. Every default is today's behaviour (UK, pounds,
-- London time), so nothing changes for anyone. Money amounts keep the exact decimal they already have; each now also
-- says which currency it is in, so an amount is never reinterpreted if a household's display currency changes later.

alter table public.families
  add column if not exists country text not null default 'GB' check (char_length(country) between 2 and 5),
  add column if not exists region text,
  add column if not exists time_zone text not null default 'Europe/London',
  add column if not exists currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$');

alter table public.expense_claims add column if not exists currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$');
alter table public.petty_cash_entries add column if not exists currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$');
alter table public.timesheet_shifts add column if not exists currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$');
alter table public.live_in_settings add column if not exists currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$');
