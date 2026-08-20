-- DoneKin schema — 25: contribute_to_project() on behalf of a dependent
--
-- A guardian with can_manage_rewards on a phone-less managed member can now
-- contribute from THAT member's personal wallet, not only their own —
-- spending someone else's Dones is the same authority as redeeming a
-- reward for them, so this reuses can_manage_member_rewards() rather than
-- introducing a new permission flag.

drop function if exists contribute_to_project(uuid, numeric, text);

create or replace function contribute_to_project(
  p_project_id uuid,
  p_amount numeric,
  p_note text default null,
  p_from_member_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_project projects;
  v_actor_member_id uuid;
  v_member_id uuid;
  v_balance numeric;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select * into v_project from projects where id = p_project_id;
  if v_project is null then
    raise exception 'project_not_found';
  end if;
  if v_project.status = 'completed' then
    raise exception 'project_already_completed';
  end if;

  v_actor_member_id := my_member_id(v_project.circle_id);
  if v_actor_member_id is null then
    raise exception 'not_a_member';
  end if;

  if p_from_member_id is not null and p_from_member_id <> v_actor_member_id then
    if not exists (select 1 from circle_members where id = p_from_member_id and circle_id = v_project.circle_id) then
      raise exception 'member_not_in_circle';
    end if;
    if not can_manage_member_rewards(p_from_member_id) then
      raise exception 'not_authorized';
    end if;
    v_member_id := p_from_member_id;
  else
    v_member_id := v_actor_member_id;
  end if;

  select coalesce(sum(amount), 0) into v_balance
  from point_transactions where member_id = v_member_id and type <> 'project_contribution';
  if v_balance < p_amount then
    raise exception 'insufficient_points';
  end if;

  insert into point_transactions (circle_id, member_id, amount, type, project_id, created_by_user_id, metadata)
  values (v_project.circle_id, v_member_id, -p_amount, 'project_payment', p_project_id, v_uid, jsonb_build_object('note', p_note));

  insert into point_transactions (circle_id, member_id, amount, type, project_id, created_by_user_id, metadata)
  values (v_project.circle_id, v_member_id, p_amount, 'project_contribution', p_project_id, v_uid, jsonb_build_object('note', p_note));

  insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, project_id, points, metadata)
  values (
    v_project.circle_id, 'project_payment', v_actor_member_id, v_uid, v_member_id, p_project_id, p_amount,
    jsonb_build_object('title', v_project.title)
  );

  -- A contributor who wasn't already assigned a task in this project still
  -- becomes a participant — same list complete_project() pays the +5
  -- completion bonus to.
  insert into project_members (project_id, member_id) values (p_project_id, v_member_id) on conflict do nothing;
end;
$$;

grant execute on function contribute_to_project(uuid, numeric, text, uuid) to authenticated;
