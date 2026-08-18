-- DoneKin schema — 21: late-completion penalty (-2 Dones / day late)
--
-- Business rule: a task with a due_date that gets completed/validated after
-- that deadline costs its performer 2 Dones per day late (rounded up — even
-- a few minutes into day 1 costs the full 2). This is always a deduction
-- from the performer's PERSONAL wallet, even if the task's own reward went
-- to a project pool — the penalty is about the individual, not the project.
-- No penalty when due_date is null, or when completed on time.

create or replace function apply_late_penalty(
  p_task tasks,
  p_member_id uuid,
  p_completion_id uuid,
  p_actor_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days_late int;
  v_penalty numeric(6,1);
begin
  if p_task.due_date is null or now() <= p_task.due_date then
    return;
  end if;

  v_days_late := ceil(extract(epoch from (now() - p_task.due_date)) / 86400.0);
  v_penalty := v_days_late * 2;

  insert into point_transactions (
    circle_id, member_id, amount, type, task_id, task_completion_id, created_by_user_id, metadata
  ) values (
    p_task.circle_id, p_member_id, -v_penalty, 'late_penalty', p_task.id, p_completion_id, p_actor_user_id,
    jsonb_build_object('days_late', v_days_late, 'due_date', p_task.due_date)
  );

  insert into activity_events (circle_id, type, actor_user_id, subject_member_id, task_id, points, metadata)
  values (
    p_task.circle_id, 'late_penalty', p_actor_user_id, p_member_id, p_task.id, -v_penalty,
    jsonb_build_object('title', p_task.title, 'days_late', v_days_late)
  );

  perform notify_member_or_guardians(
    p_member_id, p_task.circle_id, 'late_penalty',
    'Pénalité de retard',
    '"' || p_task.title || '" terminée avec ' || v_days_late || ' jour(s) de retard : -' || v_penalty || ' Dones',
    jsonb_build_object('task_id', p_task.id, 'days_late', v_days_late)
  );
end;
$$;

create or replace function complete_task(
  p_task_id uuid,
  p_performed_by_member_id uuid,
  p_notes text default null
) returns task_completions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task tasks;
  v_completion task_completions;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_task from tasks where id = p_task_id for update;
  if v_task is null then
    raise exception 'task_not_found';
  end if;
  if v_task.status in ('completed', 'cancelled', 'archived') then
    raise exception 'task_not_actionable';
  end if;

  if not exists (
    select 1 from circle_members where id = p_performed_by_member_id and circle_id = v_task.circle_id
  ) then
    raise exception 'member_not_in_circle';
  end if;

  if not (
    exists (select 1 from circle_members where id = p_performed_by_member_id and user_id = v_uid)
    or can_manage_member_tasks(p_performed_by_member_id)
  ) then
    raise exception 'not_authorized';
  end if;

  if v_task.requires_validation then
    insert into task_completions (
      task_id, circle_id, performed_by_member_id, recorded_by_user_id, status, notes
    ) values (
      p_task_id, v_task.circle_id, p_performed_by_member_id, v_uid, 'pending_validation', p_notes
    ) returning * into v_completion;

    update tasks set status = 'pending_validation' where id = p_task_id;

    insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, task_id, project_id, metadata)
    values (
      v_task.circle_id, 'validation_requested', p_performed_by_member_id, v_uid, p_performed_by_member_id, p_task_id,
      v_task.project_id, jsonb_build_object('title', v_task.title)
    );

    -- The creator is now the primary validator (business rule), so make
    -- sure they're notified even if they hold no guardian/admin role.
    perform notify_member_or_guardians(
      v_task.created_by_member_id, v_task.circle_id, 'validation_requested',
      'Validation demandée',
      (select first_name from circle_members where id = p_performed_by_member_id) || ' a terminé "' || v_task.title || '"',
      jsonb_build_object('task_id', p_task_id, 'completion_id', v_completion.id)
    );
    if v_task.created_by_member_id <> p_performed_by_member_id then
      perform notify_task_validators(
        p_performed_by_member_id, v_task.circle_id, 'validation_requested',
        'Validation demandée',
        (select first_name from circle_members where id = p_performed_by_member_id) || ' a terminé "' || v_task.title || '"',
        jsonb_build_object('task_id', p_task_id, 'completion_id', v_completion.id),
        v_uid
      );
    end if;
  else
    insert into task_completions (
      task_id, circle_id, performed_by_member_id, recorded_by_user_id, status, notes,
      points_awarded, validated_at, validated_by_user_id
    ) values (
      p_task_id, v_task.circle_id, p_performed_by_member_id, v_uid, 'approved', p_notes,
      v_task.points, now(), v_uid
    ) returning * into v_completion;

    update tasks set status = 'completed' where id = p_task_id;

    perform credit_task_completion_points(v_task, p_performed_by_member_id, v_completion.id, v_uid);
    perform apply_late_penalty(v_task, p_performed_by_member_id, v_completion.id, v_uid);

    insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, task_id, project_id, points, metadata)
    values (
      v_task.circle_id, 'task_completed', p_performed_by_member_id, v_uid, p_performed_by_member_id, p_task_id,
      v_task.project_id, v_task.points, jsonb_build_object('title', v_task.title)
    );
  end if;

  return v_completion;
end;
$$;

create or replace function validate_task_completion(
  p_completion_id uuid,
  p_approve boolean,
  p_notes text default null
) returns task_completions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completion task_completions;
  v_task tasks;
  v_uid uuid := auth.uid();
  v_validator_member_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_completion from task_completions where id = p_completion_id for update;
  if v_completion is null then
    raise exception 'completion_not_found';
  end if;
  if v_completion.status <> 'pending_validation' then
    raise exception 'completion_not_pending';
  end if;

  select * into v_task from tasks where id = v_completion.task_id for update;

  -- The task's creator is always allowed to validate their own request —
  -- guardians/admins remain a fallback (e.g. for a managed member whose
  -- creator account is no longer active).
  if not (
    is_circle_admin(v_completion.circle_id)
    or v_task.created_by_user_id = v_uid
    or can_validate_member_tasks(v_completion.performed_by_member_id)
  ) then
    raise exception 'not_authorized';
  end if;

  v_validator_member_id := my_member_id(v_completion.circle_id);

  if p_approve then
    update task_completions
      set status = 'approved',
          validated_at = now(),
          validated_by_user_id = v_uid,
          validated_by_member_id = v_validator_member_id,
          points_awarded = v_task.points,
          notes = coalesce(p_notes, notes)
      where id = p_completion_id
      returning * into v_completion;

    update tasks set status = 'completed' where id = v_task.id;

    perform credit_task_completion_points(v_task, v_completion.performed_by_member_id, v_completion.id, v_uid);
    perform apply_late_penalty(v_task, v_completion.performed_by_member_id, v_completion.id, v_uid);

    insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, task_id, project_id, points, metadata)
    values (
      v_task.circle_id, 'task_completed', v_completion.performed_by_member_id, v_uid, v_completion.performed_by_member_id,
      v_task.id, v_task.project_id, v_task.points, jsonb_build_object('title', v_task.title)
    );

    perform notify_member_or_guardians(
      v_completion.performed_by_member_id, v_task.circle_id, 'validation_approved',
      'Tâche validée', '"' || v_task.title || '" a été validée (+' || v_task.points || ' pts)',
      jsonb_build_object('task_id', v_task.id)
    );
  else
    update task_completions
      set status = 'rejected',
          validated_at = now(),
          validated_by_user_id = v_uid,
          validated_by_member_id = v_validator_member_id,
          notes = coalesce(p_notes, notes)
      where id = p_completion_id
      returning * into v_completion;

    -- "À refaire": back to todo, nothing credited, can be resubmitted.
    update tasks set status = 'todo' where id = v_task.id;

    perform notify_member_or_guardians(
      v_completion.performed_by_member_id, v_task.circle_id, 'validation_rejected',
      'Tâche non validée', '"' || v_task.title || '" doit être refaite',
      jsonb_build_object('task_id', v_task.id)
    );
  end if;

  return v_completion;
end;
$$;

grant execute on function apply_late_penalty(tasks, uuid, uuid, uuid) to authenticated;
grant execute on function complete_task(uuid, uuid, text) to authenticated;
grant execute on function validate_task_completion(uuid, boolean, text) to authenticated;
