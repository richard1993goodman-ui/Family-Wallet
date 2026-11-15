-- V2 automatic handover (agreed 15 Nov): when a nanny's shift is marked as ended, build a summary of that shift from the
-- care log, medicine, incidents and photos, save it, and send one generic push to the parents, only if there is something
-- in it. Empty sections are left out. The push text never names anyone (lock-screen rule).

create table if not exists public.handover_summaries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  nanny_id uuid references public.family_nannies(id) on delete set null,
  shift_id uuid not null unique references public.shift_sessions(id) on delete cascade,
  body jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.handover_summaries enable row level security;
revoke all on public.handover_summaries from anon, authenticated;
grant select on public.handover_summaries to authenticated;
create policy "Parents read handover summaries" on public.handover_summaries for select to authenticated
  using (is_household_owner(family_id) or exists (
    select 1 from household_members m join people p on p.id = m.person_id
    where m.family_id = handover_summaries.family_id and m.role = 'co_parent' and m.status = 'active' and p.user_id = auth.uid()
  ));

create or replace function public.build_handover_summary(_family uuid, _from timestamptz, _to timestamptz)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  _body jsonb := '{}'::jsonb;
  _care jsonb;
  _meds jsonb;
  _incidents jsonb;
  _photos int;
  _notes int;
begin
  select jsonb_agg(jsonb_build_object('kind', kind, 'count', n) order by kind) into _care
    from (select kind, count(*) n from care_events where family_id = _family and started_at >= _from and started_at < _to group by kind) x;
  if _care is not null then _body := _body || jsonb_build_object('care', _care); end if;

  select jsonb_agg(jsonb_build_object('child', child_name, 'medicine', medicine, 'dose', dose, 'at', given_at) order by given_at) into _meds
    from medication_doses where family_id = _family and given_at >= _from and given_at < _to;
  if _meds is not null then _body := _body || jsonb_build_object('medicine', _meds); end if;

  select jsonb_agg(jsonb_build_object('child', child_name, 'what', what_happened, 'at', occurred_at) order by occurred_at) into _incidents
    from incident_reports where family_id = _family and occurred_at >= _from and occurred_at < _to;
  if _incidents is not null then _body := _body || jsonb_build_object('incidents', _incidents); end if;

  select count(*) into _photos from family_moments where family_id = _family and kind = 'photo' and created_at >= _from and created_at < _to;
  if _photos > 0 then _body := _body || jsonb_build_object('photos', _photos); end if;

  select count(*) into _notes from family_moments where family_id = _family and kind <> 'photo' and created_at >= _from and created_at < _to;
  if _notes > 0 then _body := _body || jsonb_build_object('notes', _notes); end if;

  return _body;
end;
$$;

create or replace function public.on_shift_ended()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  _body jsonb;
begin
  if new.ended_at is null or old.ended_at is not null then return new; end if;
  _body := build_handover_summary(new.family_id, new.started_at, new.ended_at);
  if _body = '{}'::jsonb then return new; end if;
  insert into handover_summaries (family_id, nanny_id, shift_id, body) values (new.family_id, new.nanny_id, new.id, _body)
    on conflict (shift_id) do nothing;
  -- A generic line to the parents only (the nanny is the actor, so she is not sent it). Quiet hours are respected by push_to_app.
  perform push_to_app(new.family_id, 'nanny', 'handover', 'Today’s handover is ready');
  return new;
end;
$$;

drop trigger if exists shift_ended_handover on public.shift_sessions;
create trigger shift_ended_handover after update of ended_at on public.shift_sessions
  for each row execute function public.on_shift_ended();

revoke execute on function public.build_handover_summary(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.on_shift_ended() from public, anon, authenticated;
