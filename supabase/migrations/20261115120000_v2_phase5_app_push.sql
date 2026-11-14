-- V2 Phase 5 step 4 (agreed 14 Nov): app push for new messages, new photos and highlights only.
-- A highlight is a diary note or photo the sender ticks "Send as highlight"; nothing else pushes from here.
-- Lock-screen text stays generic (no names, no message text). The website's own browser push is unchanged.

create extension if not exists pg_net;

alter table public.family_moments add column if not exists is_highlight boolean not null default false;
alter table public.daily_logs add column if not exists is_highlight boolean not null default false;

-- One row per phone per household. Kept apart from push_subscriptions, whose browser sender cannot reach a phone.
create table if not exists public.app_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  family_id uuid not null references public.families on delete cascade,
  role text not null check (role in ('family', 'nanny')),
  token text not null check (token ~ '^ExponentPushToken\[[A-Za-z0-9_-]{10,200}\]$'),
  muted text[] not null default '{}' check (muted <@ array['messages', 'moments', 'highlights']),
  quiet_start smallint check (quiet_start between 0 and 23),
  quiet_end smallint check (quiet_end between 0 and 23),
  tz text not null default 'Europe/London',
  created_at timestamptz not null default now(),
  unique (token, family_id)
);
alter table public.app_push_tokens enable row level security;
-- Rows are added only through save_push_token; people read, change settings on and remove their own.
revoke all on public.app_push_tokens from anon, authenticated;
grant select, delete on public.app_push_tokens to authenticated;
grant update (muted, quiet_start, quiet_end) on public.app_push_tokens to authenticated;
create policy "Own phone" on public.app_push_tokens for all to authenticated
  using (user_id = auth.uid() and public.is_household_member(family_id))
  with check (user_id = auth.uid() and role = public.household_side(family_id));

-- Registers this phone for a household. A phone handed to someone else stops receiving the old user's pushes.
create or replace function public.save_push_token(_family uuid, _token text, _tz text)
returns void language plpgsql security definer set search_path = public as $$
declare side text := public.household_side(_family); zone text := 'Europe/London';
begin
  if auth.uid() is null or side is null then raise exception 'Household not found'; end if;
  begin perform now() at time zone _tz; zone := _tz; exception when others then null; end;
  delete from app_push_tokens where token = _token and user_id <> auth.uid();
  insert into app_push_tokens (user_id, family_id, role, token, tz) values (auth.uid(), _family, side, _token, zone)
  on conflict (token, family_id) do update set role = excluded.role, tz = excluded.tz;
end $$;
revoke execute on function public.save_push_token(uuid, text, text) from public, anon;
grant execute on function public.save_push_token(uuid, text, text) to authenticated, service_role;

-- Sends a generic push to the other side's phones through Expo's push service, honouring muted kinds and quiet hours.
-- Never fails the save that triggered it.
create or replace function public.push_to_app(_family uuid, _actor text, _kind text, _body text)
returns void language plpgsql security definer set search_path = public as $$
declare msgs jsonb;
begin
  select jsonb_agg(jsonb_build_object('to', t.token, 'title', 'Family Wallet', 'body', _body, 'sound', 'default'))
    into msgs
    from (select token, quiet_start s, quiet_end e, extract(hour from now() at time zone tz)::int h
            from app_push_tokens where family_id = _family and role <> _actor and not (_kind = any (muted))) t
   where t.s is null or t.e is null or t.s = t.e
      or not (case when t.s < t.e then t.h >= t.s and t.h < t.e else t.h >= t.s or t.h < t.e end);
  if msgs is null then return; end if;
  -- shortcut: one request, up to Expo's 100 per request; a household has a handful of phones. Dead tokens are not pruned yet.
  perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := msgs,
    headers := '{"Content-Type": "application/json"}'::jsonb);
exception when others then
  raise warning 'push_to_app failed: %', sqlerrm;
end $$;
revoke execute on function public.push_to_app(uuid, text, text, text) from public, anon, authenticated;

-- Saves from the app also update the website's badges (the website's server writes its own badge lines).
create or replace function public.app_activity(_family uuid, _actor text, _feature text, _kind text, _body text, _push boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    insert into wallet_activity (family_id, feature, actor, summary) values (_family, _feature, _actor, _body);
  end if;
  if _push then perform public.push_to_app(_family, _actor, _kind, _body); end if;
end $$;
revoke execute on function public.app_activity(uuid, text, text, text, text, boolean) from public, anon, authenticated;

create or replace function public.on_message_added() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.app_activity((select family_id from household_threads where id = new.thread_id), new.sender, 'messages', 'messages', 'New message', true);
  return new;
end $$;
create or replace function public.on_moment_added() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.app_activity(new.family_id, new.added_by, 'moments',
    case when new.is_highlight then 'highlights' else 'moments' end,
    case when new.is_highlight then 'New highlight' when new.kind = 'milestone' then 'New milestone' else 'New photo' end, true);
  return new;
end $$;
-- Diary notes push only when ticked as a highlight. daily_logs has no "who" column, so the side comes from the writer.
create or replace function public.on_diary_added() returns trigger language plpgsql security definer set search_path = public as $$
declare side text := coalesce(public.household_side(new.family_id), 'nanny');
begin
  perform public.app_activity(new.family_id, side, 'log', 'highlights',
    case when new.is_highlight then 'New highlight' else 'New daily update' end, new.is_highlight);
  return new;
end $$;
revoke execute on function public.on_message_added(), public.on_moment_added(), public.on_diary_added() from public, anon, authenticated;

drop trigger if exists app_push on public.household_messages;
create trigger app_push after insert on public.household_messages for each row execute function public.on_message_added();
drop trigger if exists app_push on public.family_moments;
create trigger app_push after insert on public.family_moments for each row execute function public.on_moment_added();
drop trigger if exists app_push on public.daily_logs;
create trigger app_push after insert on public.daily_logs for each row execute function public.on_diary_added();
