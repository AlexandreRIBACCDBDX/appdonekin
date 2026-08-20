-- DoneKin schema — 30: fix duplicate function overloads (integer vs numeric era)
--
-- admin_adjust_points started throwing "Could not choose the best candidate
-- function" — both its original integer-amount version
-- (20260812091400_admin_rpc.sql) and its later numeric-amount version
-- (20260813090100_points_rules_functions.sql) exist live at once, even
-- though the numeric migration DID drop the integer one first. The most
-- likely cause: an older migration file got re-applied after a newer one
-- (e.g. re-running admin_rpc.sql "just to be sure" during earlier
-- troubleshooting), which silently recreates the old overload alongside
-- the new one — `create or replace` only replaces an EXACT signature
-- match, so a differently-typed old version just sits there as a second
-- candidate.
--
-- Every other function whose signature changed shape across this schema's
-- history has the exact same latent exposure, for the exact same reason —
-- so rather than fix admin_adjust_points alone and hit this one-by-one for
-- the rest, this drops every known old AND new signature for each of them,
-- then recreates the single correct (current) version. Idempotent either
-- way: a signature that was never live is simply a no-op drop.

-- ---------------------------------------------------------------------
-- admin_adjust_points
-- ---------------------------------------------------------------------

drop function if exists admin_adjust_points(uuid, integer, text);
drop function if exists admin_adjust_points(uuid, numeric, text);

create or replace function admin_adjust_points(p_member_id uuid, p_amount numeric, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
begin
  perform require_platform_role('super_admin', 'admin');

  if p_amount = 0 then
    raise exception 'invalid_amount';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;

  select circle_id into v_circle_id from circle_members where id = p_member_id;
  if v_circle_id is null then
    raise exception 'member_not_found';
  end if;

  insert into point_transactions (circle_id, member_id, amount, type, created_by_user_id, metadata)
  values (v_circle_id, p_member_id, p_amount, 'admin_adjustment', auth.uid(), jsonb_build_object('reason', p_reason));

  insert into activity_events (circle_id, type, actor_user_id, subject_member_id, points, metadata)
  values (v_circle_id, 'admin_adjustment', auth.uid(), p_member_id, p_amount, jsonb_build_object('reason', p_reason));

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason, metadata)
  values (auth.uid(), 'POINTS_ADJUSTED', 'circle_member', p_member_id, p_reason, jsonb_build_object('amount', p_amount));
end;
$$;

-- ---------------------------------------------------------------------
-- transfer_points
-- ---------------------------------------------------------------------

drop function if exists transfer_points(uuid, uuid, integer, text);
drop function if exists transfer_points(uuid, uuid, numeric, text);

create or replace function transfer_points(
  p_circle_id uuid,
  p_to_member_id uuid,
  p_amount numeric,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_member_id uuid;
  v_balance numeric;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  v_from_member_id := my_member_id(p_circle_id);
  if v_from_member_id is null then
    raise exception 'not_a_member';
  end if;
  if v_from_member_id = p_to_member_id then
    raise exception 'cannot_transfer_to_self';
  end if;
  if not exists (select 1 from circle_members where id = p_to_member_id and circle_id = p_circle_id) then
    raise exception 'recipient_not_in_circle';
  end if;

  select coalesce(sum(amount), 0) into v_balance
  from point_transactions where member_id = v_from_member_id and type <> 'project_contribution';
  if v_balance < p_amount then
    raise exception 'insufficient_points';
  end if;

  insert into point_transactions (circle_id, member_id, amount, type, related_member_id, created_by_user_id, metadata)
  values (p_circle_id, v_from_member_id, -p_amount, 'transfer_sent', p_to_member_id, auth.uid(), jsonb_build_object('note', p_note));

  insert into point_transactions (circle_id, member_id, amount, type, related_member_id, created_by_user_id, metadata)
  values (p_circle_id, p_to_member_id, p_amount, 'transfer_received', v_from_member_id, auth.uid(), jsonb_build_object('note', p_note));

  insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, points, metadata)
  values (p_circle_id, 'points_transferred', v_from_member_id, auth.uid(), p_to_member_id, p_amount, jsonb_build_object('note', p_note));

  perform notify_member_or_guardians(
    p_to_member_id, p_circle_id, 'points_transferred',
    'Points reçus', '+' || p_amount || ' pts reçus',
    jsonb_build_object('amount', p_amount, 'from_member_id', v_from_member_id)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- grant_bonus_points
-- ---------------------------------------------------------------------

drop function if exists grant_bonus_points(uuid, uuid, integer, text);
drop function if exists grant_bonus_points(uuid, uuid, numeric, text);

create or replace function grant_bonus_points(
  p_circle_id uuid,
  p_member_id uuid,
  p_amount numeric,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_amount = 0 then
    raise exception 'invalid_amount';
  end if;
  if not (is_circle_admin(p_circle_id) or can_manage_member_tasks(p_member_id)) then
    raise exception 'not_authorized';
  end if;
  if not exists (select 1 from circle_members where id = p_member_id and circle_id = p_circle_id) then
    raise exception 'member_not_in_circle';
  end if;

  insert into point_transactions (circle_id, member_id, amount, type, created_by_user_id, metadata)
  values (p_circle_id, p_member_id, p_amount, 'bonus', v_uid, jsonb_build_object('reason', p_reason));

  insert into activity_events (circle_id, type, actor_user_id, subject_member_id, points, metadata)
  values (p_circle_id, 'bonus', v_uid, p_member_id, p_amount, jsonb_build_object('reason', p_reason));

  perform notify_member_or_guardians(
    p_member_id, p_circle_id, 'points_transferred',
    'Bonus reçu', '+' || p_amount || ' pts bonus',
    jsonb_build_object('amount', p_amount, 'reason', p_reason)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- create_task
-- ---------------------------------------------------------------------

drop function if exists create_task(uuid, text, text, uuid, integer, task_priority, timestamptz, boolean, uuid, recurrence_frequency);
drop function if exists create_task(uuid, text, uuid, text, numeric, task_priority, timestamptz, uuid, recurrence_frequency);

create or replace function create_task(
  p_circle_id uuid,
  p_title text,
  p_assigned_to_member_id uuid,
  p_description text default null,
  p_points numeric default 0,
  p_priority task_priority default 'medium',
  p_due_date timestamptz default null,
  p_project_id uuid default null,
  p_recurrence recurrence_frequency default 'none'
) returns tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member_id uuid;
  v_task tasks;
  v_is_self boolean;
  v_final_points numeric(6,1);
  v_requires_validation boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_member_id := my_member_id(p_circle_id);
  if v_member_id is null then
    raise exception 'not_a_member';
  end if;

  if p_assigned_to_member_id is null then
    raise exception 'assignee_required';
  end if;
  if not exists (
    select 1 from circle_members where id = p_assigned_to_member_id and circle_id = p_circle_id
  ) then
    raise exception 'assignee_not_in_circle';
  end if;

  if p_project_id is not null and not exists (
    select 1 from projects where id = p_project_id and circle_id = p_circle_id
  ) then
    raise exception 'project_not_in_circle';
  end if;

  v_is_self := (p_assigned_to_member_id = v_member_id);

  if v_is_self then
    v_final_points := 0.5;
    v_requires_validation := false;
  else
    v_final_points := greatest(coalesce(p_points, 0), 0);
    v_requires_validation := true;
  end if;

  insert into tasks (
    circle_id, project_id, title, description, assigned_to_member_id,
    created_by_member_id, created_by_user_id, priority, points, due_date,
    requires_validation, recurrence
  ) values (
    p_circle_id, p_project_id, p_title, p_description, p_assigned_to_member_id,
    v_member_id, v_uid, p_priority, v_final_points, p_due_date,
    v_requires_validation, p_recurrence
  ) returning * into v_task;

  if not v_is_self then
    perform notify_member_or_guardians(
      p_assigned_to_member_id, p_circle_id, 'task_assigned',
      'Nouvelle tâche', p_title,
      jsonb_build_object('task_id', v_task.id)
    );
  end if;

  return v_task;
end;
$$;

-- ---------------------------------------------------------------------
-- credit_task_completion_points
-- ---------------------------------------------------------------------

drop function if exists credit_task_completion_points(tasks, uuid, uuid, uuid);
drop function if exists credit_task_completion_points(tasks, uuid, uuid, uuid, uuid[]);

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

-- ---------------------------------------------------------------------
-- complete_task
-- ---------------------------------------------------------------------

drop function if exists complete_task(uuid, uuid, text);
drop function if exists complete_task(uuid, uuid, text, uuid[]);

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

-- ---------------------------------------------------------------------
-- contribute_to_project
-- ---------------------------------------------------------------------

drop function if exists contribute_to_project(uuid, numeric, text);
drop function if exists contribute_to_project(uuid, numeric, text, uuid);

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

  insert into project_members (project_id, member_id) values (p_project_id, v_member_id) on conflict do nothing;
end;
$$;

grant execute on function admin_adjust_points(uuid, numeric, text) to authenticated;
grant execute on function transfer_points(uuid, uuid, numeric, text) to authenticated;
grant execute on function grant_bonus_points(uuid, uuid, numeric, text) to authenticated;
grant execute on function create_task(uuid, text, uuid, text, numeric, task_priority, timestamptz, uuid, recurrence_frequency) to authenticated;
grant execute on function credit_task_completion_points(tasks, uuid, uuid, uuid, uuid[]) to authenticated;
grant execute on function complete_task(uuid, uuid, text, uuid[]) to authenticated;
grant execute on function contribute_to_project(uuid, numeric, text, uuid) to authenticated;
