-- V2 Family and home pages (agreed 14 Nov 2026, plan section 5f). Test copy first; live only with approval.
-- Additive only: V1 uses the service key, which ignores these rules, so the website is unaffected.

-- Kids' playbook: staff add and change only Rainy-day ideas (the website's rule); parents anything.
drop policy if exists "Members add own" on public.kids_playbook_entries;
create policy "Members add own" on public.kids_playbook_entries for insert to authenticated
  with check (public.is_household_member(family_id) and created_by = auth.uid()
    and added_by = public.household_side(family_id) and (added_by = 'family' or category = 'activities'));
drop policy if exists "Own or parent change" on public.kids_playbook_entries;
create policy "Own or parent change" on public.kids_playbook_entries for update to authenticated
  using (public.is_household_owner(family_id) or (public.is_household_member(family_id) and created_by = auth.uid()))
  with check (public.is_household_owner(family_id)
    or (public.is_household_member(family_id) and created_by = auth.uid() and category = 'activities'));

-- House codes: the app can't read secret_value; anyone in the household shows one code at a time, parents set them.
create or replace function public.reveal_house_code(_id uuid)
returns text language plpgsql stable security definer set search_path to 'public' as $$
declare fam uuid; val text;
begin
  select family_id, secret_value into fam, val from house_manual_entries where id = _id;
  if fam is null or not is_household_member(fam) then raise exception 'Not part of this household'; end if;
  return val;
end $$;

create or replace function public.set_house_code(_id uuid, _value text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare fam uuid;
begin
  select family_id into fam from house_manual_entries where id = _id;
  if fam is null or not is_household_owner(fam) then raise exception 'Only a parent of this household can set a code'; end if;
  if char_length(coalesce(_value, '')) > 500 then raise exception 'Code is too long'; end if;
  update house_manual_entries set secret_value = nullif(trim(coalesce(_value, '')), ''), updated_at = now() where id = _id;
end $$;

-- Travel pack: trips are parent-only, but everyone ticks the checklist and adds handover notes (the website's rule).
create or replace function public.travel_checklist(_trip uuid, _action text, _value text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare fam uuid; list jsonb; label text := left(trim(coalesce(_value, '')), 160);
begin
  select family_id, checklist into fam, list from travel_trips where id = _trip for update;
  if fam is null or not is_household_member(fam) then raise exception 'Not part of this household'; end if;
  if _action = 'toggle' then
    select coalesce(jsonb_agg(case when i->>'id' = _value
      then jsonb_set(i, '{done}', to_jsonb(not coalesce((i->>'done')::boolean, false))) else i end order by o), '[]')
      into list from jsonb_array_elements(list) with ordinality t(i, o);
  elsif _action = 'remove' then
    select coalesce(jsonb_agg(i order by o), '[]') into list
      from jsonb_array_elements(list) with ordinality t(i, o) where i->>'id' is distinct from _value;
  elsif _action = 'add' then
    if label = '' then raise exception 'Write the item first'; end if;
    if jsonb_array_length(list) >= 80 then raise exception 'The checklist is full'; end if;
    list := list || jsonb_build_object('id', gen_random_uuid()::text, 'label', label, 'done', false);
  else raise exception 'Unknown checklist action';
  end if;
  update travel_trips set checklist = list, updated_at = now() where id = _trip;
end $$;

create or replace function public.add_travel_note(_trip uuid, _category text, _text text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare fam uuid; old jsonb; body text := left(trim(coalesce(_text, '')), 1200); who text;
begin
  select family_id, handover_notes into fam, old from travel_trips where id = _trip for update;
  if fam is null or not is_household_member(fam) then raise exception 'Not part of this household'; end if;
  if body = '' then raise exception 'Write the note first'; end if;
  select display_name into who from people where user_id = auth.uid();
  -- Newest first, keeping 200, as the website does.
  update travel_trips set updated_at = now(), handover_notes = (
    select jsonb_agg(n order by o) from (
      select 0::bigint o, jsonb_build_object('id', gen_random_uuid()::text,
        'category', coalesce(nullif(left(trim(coalesce(_category, '')), 40), ''), 'general'), 'text', body,
        'authorRole', household_side(fam), 'authorName', coalesce(who, 'Someone'), 'createdAt', now()) n
      union all
      select o, x from jsonb_array_elements(old) with ordinality t(x, o) where o < 200
    ) notes)
  where id = _trip;
end $$;

revoke execute on function public.reveal_house_code(uuid) from public, anon;
revoke execute on function public.set_house_code(uuid, text) from public, anon;
revoke execute on function public.travel_checklist(uuid, text, text) from public, anon;
revoke execute on function public.add_travel_note(uuid, text, text) from public, anon;
grant execute on function public.reveal_house_code(uuid) to authenticated, service_role;
grant execute on function public.set_house_code(uuid, text) to authenticated, service_role;
grant execute on function public.travel_checklist(uuid, text, text) to authenticated, service_role;
grant execute on function public.add_travel_note(uuid, text, text) to authenticated, service_role;
