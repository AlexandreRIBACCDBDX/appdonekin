-- DoneKin schema — 24: shared task completions — functions
--
-- credit_task_completion_points() now splits an orphan task's (no
-- project_id) points evenly across the performer and whoever helped,
-- instead of paying the performer alone. Project-linked tasks are
-- unaffected — their points always go to the project's pool as one lump
-- regardless of who completed them, so sharing doesn't apply there.
-- The late-completion penalty (apply_late_penalty) still applies only to
-- the recorded performer — it's about the individual, never split.
--
-- Signatures changed (a parameter was added), so — same reason as every
-- earlier signature change in this schema — the old versions are dropped
-- explicitly first, or PostgREST would see two ambiguous overloads.

drop function if exists credit_task_completion_points(tasks, uuid, uuid, uuid);
drop function if exists complete_task(uuid, uuid, text);
drop function if exists validate_task_completion(uuid, boolean, text);

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

create or replace function complete_task(
  p_task_id uuid,
  p_performed_by_member_id uuid,
  p_notes text default null,
  p_shared_with_member_ids uuid[] default null
) returns task_completions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task tasks;
  v_completion task_completions;
  v_uid uuid := auth.uid();
  v_shared uuid[];
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

  -- Sharing only makes sense for a personal task — a project task's points
  -- go to the pool as one lump no matter who did it, so any helper list is
  -- silently ignored there rather than rejected.
  if v_task.project_id is null and p_shared_with_member_ids is not null and array_length(p_shared_with_member_ids, 1) > 0 then
    if exists (
      select 1 from unnest(p_shared_with_member_ids) as helper_id
      where not exists (select 1 from circle_members where id = helper_id and circle_id = v_task.circle_id)
    ) then
      raise exception 'helper_not_in_circle';
    end if;
    v_shared := p_shared_with_member_ids;
  else
    v_shared := null;
  end if;

  if v_task.requires_validation then
    insert into task_completions (
      task_id, circle_id, performed_by_member_id, recorded_by_user_id, status, notes, shared_with_member_ids
    ) values (
      p_task_id, v_task.circle_id, p_performed_by_member_id, v_uid, 'pending_validation', p_notes, v_shared
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
      points_awarded, validated_at, validated_by_user_id, shared_with_member_ids
    ) values (
      p_task_id, v_task.circle_id, p_performed_by_member_id, v_uid, 'approved', p_notes,
      v_task.points, now(), v_uid, v_shared
    ) returning * into v_completion;

    update tasks set status = 'completed' where id = p_task_id;

    perform credit_task_completion_points(v_task, p_performed_by_member_id, v_completion.id, v_uid, v_shared);
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

    perform credit_task_completion_points(
      v_task, v_completion.performed_by_member_id, v_completion.id, v_uid, v_completion.shared_with_member_ids
    );
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

grant execute on function credit_task_completion_points(tasks, uuid, uuid, uuid, uuid[]) to authenticated;
grant execute on function complete_task(uuid, uuid, text, uuid[]) to authenticated;
grant execute on function validate_task_completion(uuid, boolean, text) to authenticated;
