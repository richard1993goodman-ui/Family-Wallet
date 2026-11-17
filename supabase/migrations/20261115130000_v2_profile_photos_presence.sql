-- V2 app: profile photos and who is online (agreed 14 Nov). Additive only; the website keeps working as it is.
-- Photos: the app uploads to family-docs/avatars/<household>/<file>; set_profile_photo decides whose photo it becomes:
--   parents may set any child's or staff member's photo, everyone may set their own.
-- Online: the app calls i_am_here every minute while open; "online" means seen in the last 5 minutes.

alter table public.people add column if not exists photo_path text;
alter table public.people add column if not exists last_seen_at timestamptz;

drop policy if exists "Members upload profile photos" on storage.objects;
create policy "Members upload profile photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'family-docs'
  and (storage.foldername(name))[1] = 'avatars'
  and case when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_household_member(((storage.foldername(name))[2])::uuid) else false end
);

-- Read: the household's own avatars folder, plus photos the website stored elsewhere that a profile points at
-- (never the vault or the photo-moments folders, so a profile cannot be aimed at a private file).
drop policy if exists "Members read profile photos" on storage.objects;
create policy "Members read profile photos" on storage.objects for select to authenticated using (
  bucket_id = 'family-docs' and (
    ((storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.is_household_member(((storage.foldername(name))[2])::uuid))
    or (coalesce((storage.foldername(name))[1], '') not in ('vault', 'moments', 'avatars') and (
      exists (select 1 from public.family_nannies n where n.photo_path = objects.name and public.is_household_member(n.family_id))
      or exists (select 1 from public.family_children c where c.photo_path = objects.name and public.is_household_member(c.family_id))))
  )
);

create or replace function public.set_profile_photo(_family uuid, _kind text, _id uuid, _path text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me_staff uuid := public.my_staff_nanny(_family); parent boolean := public.is_household_owner(_family);
begin
  if not (parent or me_staff is not null) then raise exception 'Not your household'; end if;
  if _path is not null and (split_part(_path, '/', 1) <> 'avatars' or split_part(_path, '/', 2) <> _family::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'family-docs' and o.name = _path)) then
    raise exception 'Upload the photo first';
  end if;
  if _kind = 'me' and not parent then
    update public.family_nannies set photo_path = _path, updated_at = now() where id = me_staff and family_id = _family;
  elsif _kind = 'me' then
    update public.people set photo_path = _path where user_id = auth.uid();
  elsif _kind = 'staff' and (parent or _id = me_staff) then
    update public.family_nannies set photo_path = _path, updated_at = now() where id = _id and family_id = _family;
  elsif _kind = 'child' and parent then
    update public.family_children set photo_path = _path where id = _id and family_id = _family;
  else
    raise exception 'Only a parent can change that photo';
  end if;
  return found;
end $$;

-- Marks the caller as here now (people row, and their staff row in this household so the website sees it too).
create or replace function public.i_am_here(_family uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_household_member(_family) then raise exception 'Not your household'; end if;
  update public.people set last_seen_at = now() where user_id = auth.uid();
  update public.family_nannies set last_seen_at = now() where id = public.my_staff_nanny(_family) and family_id = _family;
end $$;

-- Everyone in the household with a photo: the people who use the app (parents and staff with an account), then the children.
create or replace function public.household_photos(_family uuid)
returns table (kind text, id uuid, name text, role text, photo_path text, online boolean, me boolean)
language sql stable security definer set search_path = public as $$
  select * from (
    select case when m.role = 'staff' then 'staff' else 'parent' end, coalesce(m.nanny_id, p.id), coalesce(n.name, p.display_name),
      coalesce(n.role, m.role), coalesce(n.photo_path, p.photo_path),
      coalesce(greatest(p.last_seen_at, n.last_seen_at) > now() - interval '5 minutes', false), p.user_id = auth.uid()
    from public.household_members m join public.people p on p.id = m.person_id
    left join public.family_nannies n on n.id = m.nanny_id
    where m.family_id = _family and m.status = 'active' and public.is_household_member(_family)
    order by case m.role when 'owner' then 0 when 'co_parent' then 1 else 2 end, n.sort_order, p.display_name
  ) users
  union all
  select 'child', c.id, c.name, null, c.photo_path, false, false
  from public.family_children c where c.family_id = _family and public.is_household_member(_family);
$$;

revoke all on function public.set_profile_photo(uuid, text, uuid, text), public.i_am_here(uuid), public.household_photos(uuid) from public, anon;
grant execute on function public.set_profile_photo(uuid, text, uuid, text), public.i_am_here(uuid), public.household_photos(uuid) to authenticated;
