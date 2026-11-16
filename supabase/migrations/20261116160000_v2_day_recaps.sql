-- V2 (decided 16 Nov): an AI-written recap of each child's day, off until a parent switches it on.
-- The day-recap server function reads the day's log as the signed-in person, asks the AI for a few warm sentences, and
-- stores one recap per child per day here. Everyone in the household can read it; only the server function writes it.
-- Medicine and incident records are never changed by any of this.

alter table public.families add column if not exists ai_recap boolean not null default false;

create table if not exists public.day_recaps (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.family_children(id) on delete cascade,
  day date not null,
  body text not null,
  model text not null,
  created_at timestamptz not null default now(),
  unique (family_id, child_id, day)
);

alter table public.day_recaps enable row level security;
revoke all on public.day_recaps from anon, authenticated;
grant select on public.day_recaps to authenticated;
drop policy if exists "Members read recaps" on public.day_recaps;
create policy "Members read recaps" on public.day_recaps for select to authenticated
  using (household_side(family_id) is not null);

-- Whether the household has recaps on. Null for someone who is not in the household.
create or replace function public.ai_recap_on(_family uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when household_side(_family) is null then null else (select ai_recap from families where id = _family) end
$$;

create or replace function public.set_ai_recap(_family uuid, _on boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not is_household_owner(_family) then raise exception 'Only a parent can change this.'; end if;
  update families set ai_recap = coalesce(_on, false) where id = _family;
  insert into audit_log (actor_kind, actor_id, action, family_id)
    values ('parent', (select id::text from people where user_id = auth.uid()), case when _on then 'ai_recap_on' else 'ai_recap_off' end, _family);
end;
$$;

revoke all on function public.ai_recap_on(uuid) from public, anon;
revoke all on function public.set_ai_recap(uuid, boolean) from public, anon;
grant execute on function public.ai_recap_on(uuid) to authenticated;
grant execute on function public.set_ai_recap(uuid, boolean) to authenticated;

-- A sixth notification kind people can mute: "Daily recap ready".
do $$
declare n text;
begin
  select conname into n from pg_constraint
    where conrelid = 'public.app_push_tokens'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%muted%';
  if n is not null then execute format('alter table public.app_push_tokens drop constraint %I', n); end if;
  alter table public.app_push_tokens add constraint app_push_tokens_muted_check
    check (muted <@ array['messages', 'moments', 'highlights', 'approvals', 'reports', 'recaps']);
end $$;

-- The server function sends the "recap is ready" push through the existing sender.
grant execute on function public.push_to_app(uuid, text, text, text) to service_role;
