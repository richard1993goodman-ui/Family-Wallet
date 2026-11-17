-- V2 review check-ins (agreed 15 Nov: first month, 3 months, 6 months, then a yearly review). The app writes through this one
-- function: only a parent of the family can write, the nanny must belong to that family, the answers are limited to the
-- agreed questions, and a completed check-in can't be changed. Nannies can read their own (existing policy).

create or replace function public.save_review_checkin(_family uuid, _nanny uuid, _kind text, _answers jsonb, _complete boolean, _id uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  _key text;
  _value text;
  _allowed text[] := array['going_well', 'tricky', 'children', 'schedule', 'pay', 'training', 'next'];
  _kinds text[] := array['first_month', 'three_month', 'six_month', 'annual', 'custom'];
  _row uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not (is_household_owner(_family) or exists (
    select 1 from household_members m join people p on p.id = m.person_id
    where m.family_id = _family and m.role = 'co_parent' and m.status = 'active' and p.user_id = auth.uid()
  )) then raise exception 'Only a parent can write a review.'; end if;
  if not (_kind = any(_kinds)) then raise exception 'Choose a kind of review.'; end if;
  if not exists (select 1 from family_nannies where id = _nanny and family_id = _family) then
    raise exception 'That nanny is not part of this family.';
  end if;
  if jsonb_typeof(coalesce(_answers, '{}'::jsonb)) <> 'object' then raise exception 'The answers are not in the right form.'; end if;
  for _key in select jsonb_object_keys(coalesce(_answers, '{}'::jsonb)) loop
    if not (_key = any(_allowed)) then raise exception 'Unknown question: %', _key; end if;
    _value := _answers ->> _key;
    if char_length(coalesce(_value, '')) > 1000 then raise exception 'An answer is too long (1000 characters at most).'; end if;
  end loop;

  if _id is null then
    insert into review_checkins (family_id, nanny_id, kind, status, answers, author, completed_at)
      values (_family, _nanny, _kind, case when _complete then 'completed' else 'draft' end, coalesce(_answers, '{}'::jsonb), 'family',
        case when _complete then now() end)
      returning id into _row;
  else
    if exists (select 1 from review_checkins where id = _id and status = 'completed') then
      raise exception 'A completed review can''t be changed.';
    end if;
    update review_checkins set answers = coalesce(_answers, '{}'::jsonb), kind = _kind,
        status = case when _complete then 'completed' else 'draft' end,
        completed_at = case when _complete then now() else null end, updated_at = now()
      where id = _id and family_id = _family and nanny_id = _nanny
      returning id into _row;
    if _row is null then raise exception 'That review was not found for this nanny.'; end if;
  end if;

  insert into audit_log (actor_kind, actor_id, action, family_id)
    values ('parent', (select id::text from people where user_id = auth.uid()), case when _complete then 'review_completed' else 'review_saved' end, _family);
  return _row;
end;
$$;

revoke execute on function public.save_review_checkin(uuid, uuid, text, jsonb, boolean, uuid) from public, anon;
grant execute on function public.save_review_checkin(uuid, uuid, text, jsonb, boolean, uuid) to authenticated, service_role;
