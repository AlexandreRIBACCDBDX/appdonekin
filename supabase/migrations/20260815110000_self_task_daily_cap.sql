-- DoneKin schema — 28: daily cap on self-task Dones (anti-farming)
--
-- A self-task (assigned_to_member_id = created_by_member_id) is
-- auto-credited with no validation step (create_task forces
-- requires_validation = false for these) — by design, for frictionless
-- personal habit tracking. Without a cap, that same frictionlessness lets
-- someone spam trivial self-tasks for unlimited Dones. Once a member has
-- already earned 3 Dones today from self-tasks, further self-tasks still
-- complete normally (status goes to 'completed') but simply stop paying
-- out — no error, no blocked action, just no points. Since every self-task
-- is a fixed 0.5, 3 Dones/day is exactly 6 self-tasks/day, so the cap never
-- lands mid-task (no partial-credit case to handle).
--
-- No signature change, so no drop needed — same create or replace pattern
-- as every other in-place function update in this schema.

create or replace function credit_task_completion_points(
  p_task tasks,
  p_member_id uuid,
  p_completion_id uuid,
  p_actor_user_id uuid,
  p_shared_with_member_ids uuid[] default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipients uuid[];
  v_count int;
  v_share numeric(6,1);
  v_remainder numeric(6,1);
  v_recipient uuid;
  v_is_self_task boolean;
  v_today_self_earned numeric(6,1);
begin
  if p_task.points = 0 then
    return;
  end if;

  if p_task.project_id is not null then
    insert into point_transactions (
      circle_id, member_id, amount, type, task_id, task_completion_id, project_id, created_by_user_id
    ) values (
      p_task.circle_id, p_member_id, p_task.points, 'project_contribution', p_task.id, p_completion_id,
      p_task.project_id, p_actor_user_id
    );
    return;
  end if;

  v_is_self_task := (p_task.assigned_to_member_id = p_task.created_by_member_id);
  if v_is_self_task then
    select coalesce(sum(pt.amount), 0) into v_today_self_earned
    from point_transactions pt
    join tasks t on t.id = pt.task_id
    where pt.member_id = p_member_id
      and pt.type = 'task_reward'
      and t.assigned_to_member_id = t.created_by_member_id
      and pt.created_at::date = current_date;

    if v_today_self_earned >= 3 then
      return;
    end if;
  end if;

  v_recipients := array(
    select distinct unnest(array_prepend(p_member_id, coalesce(p_shared_with_member_ids, '{}'::uuid[])))
  );
  v_count := array_length(v_recipients, 1);

  if v_count <= 1 then
    insert into point_transactions (circle_id, member_id, amount, type, task_id, task_completion_id, created_by_user_id)
    values (p_task.circle_id, p_member_id, p_task.points, 'task_reward', p_task.id, p_completion_id, p_actor_user_id);
    return;
  end if;

  -- Split evenly, truncated to the nearest 0.1 — the rounding remainder
  -- goes to the performer so the total credited always equals the task's
  -- points exactly, never a fraction more or less.
  v_share := trunc(p_task.points / v_count, 1);
  v_remainder := p_task.points - (v_share * v_count);

  foreach v_recipient in array v_recipients loop
    insert into point_transactions (
      circle_id, member_id, amount, type, task_id, task_completion_id, created_by_user_id, metadata
    ) values (
      p_task.circle_id,
      v_recipient,
      v_share + (case when v_recipient = p_member_id then v_remainder else 0 end),
      'task_reward',
      p_task.id,
      p_completion_id,
      p_actor_user_id,
      jsonb_build_object('shared_with', to_jsonb(v_recipients))
    );
  end loop;
end;
$$;

grant execute on function credit_task_completion_points(tasks, uuid, uuid, uuid, uuid[]) to authenticated;
