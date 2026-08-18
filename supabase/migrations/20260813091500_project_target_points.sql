-- DoneKin schema — 19: project target amount ("objectif de Dones")
--
-- A project can now carry a target amount of Dones its shared pool must
-- reach before it can be closed. Null means no target (existing behavior:
-- completable any time by the creator/admin). complete_project() enforces
-- this — the client-side "Terminer" button also disables early using the
-- same balance/target comparison, but the RPC is the actual guard.

alter table projects add column target_points numeric(6,1);

alter table projects add constraint projects_target_points_positive
  check (target_points is null or target_points > 0);

create or replace function complete_project(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_project projects;
  v_pool_balance numeric(10,1);
  v_confirmed_count int;
  v_denied_count int;
  v_promise_kept boolean := false;
  v_participant record;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_project from projects where id = p_project_id for update;
  if v_project is null then
    raise exception 'project_not_found';
  end if;
  if v_project.status = 'completed' then
    raise exception 'project_already_completed';
  end if;

  if not (is_circle_admin(v_project.circle_id) or v_project.created_by_user_id = v_uid) then
    raise exception 'not_authorized';
  end if;

  if v_project.target_points is not null then
    select coalesce(sum(amount), 0) into v_pool_balance
    from point_transactions where project_id = p_project_id and type = 'project_contribution';

    if v_pool_balance < v_project.target_points then
      raise exception 'target_not_reached';
    end if;
  end if;

  update projects set status = 'completed', updated_at = now() where id = p_project_id;

  for v_participant in select member_id from project_members where project_id = p_project_id loop
    insert into point_transactions (circle_id, member_id, amount, type, project_id, created_by_user_id, metadata)
    values (v_project.circle_id, v_participant.member_id, 5, 'bonus', p_project_id, v_uid, jsonb_build_object('reason', 'project_completion'));
  end loop;

  if v_project.promise_description is not null then
    select
      count(*) filter (where confirmed) ,
      count(*) filter (where not confirmed)
      into v_confirmed_count, v_denied_count
    from project_promise_votes where project_id = p_project_id;

    if v_confirmed_count > 0 and v_confirmed_count > v_denied_count then
      v_promise_kept := true;
      insert into point_transactions (circle_id, member_id, amount, type, project_id, created_by_user_id, metadata)
      values (
        v_project.circle_id, v_project.created_by_member_id, 10, 'bonus', p_project_id, v_uid,
        jsonb_build_object('reason', 'promise_kept')
      );
    end if;
  end if;

  insert into activity_events (circle_id, type, actor_user_id, project_id, metadata)
  values (
    v_project.circle_id, 'project_completed', v_uid, p_project_id,
    jsonb_build_object('title', v_project.title, 'promise_kept', v_promise_kept)
  );

  return jsonb_build_object('promise_kept', v_promise_kept);
end;
$$;

grant execute on function complete_project(uuid) to authenticated;
