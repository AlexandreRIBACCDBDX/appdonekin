-- DoneKin schema — 18: points engine v2 — RPC rewrite
--
-- Business rules implemented here (see conversation spec):
--  1. A self-created, self-performed task always pays exactly 0.5 pt, no
--     validation step — the creator's chosen point value is ignored.
--  2. A task created for someone else: the creator sets the point value
--     freely, an assignee is mandatory, and completion always requires the
--     CREATOR (not just an admin/guardian) to confirm before points move.
--  3. Points from a task go to the project's pool if the task belongs to one
--     — never to the performer's personal wallet in that case, and never
--     both.
--  4. Completing a project pays every participant +5 personal points, once.
--  5. A project can carry the creator's "promise" — if the OTHER members
--     confirm it was kept, the creator gets +10 personal points.

-- Signatures below changed shape (params added/removed/retyped for numeric
-- points), which makes them different overloads to Postgres — drop the old
-- ones explicitly so PostgREST never has two ambiguous candidates.
drop function if exists create_task(uuid, text, text, uuid, integer, task_priority, timestamptz, boolean, uuid, recurrence_frequency);
drop function if exists transfer_points(uuid, uuid, integer, text);
drop function if exists grant_bonus_points(uuid, uuid, integer, text);
drop function if exists admin_adjust_points(uuid, integer, text);

-- Shared by complete_task() and validate_task_completion(): credits
-- p_task.points to whichever destination is exclusive for this task —
-- the project pool if it has one, otherwise the performer's personal wallet.
create or replace function credit_task_completion_points(
  p_task tasks,
  p_member_id uuid,
  p_completion_id uuid,
  p_actor_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
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
  else
    insert into point_transactions (circle_id, member_id, amount, type, task_id, task_completion_id, created_by_user_id)
    values (p_task.circle_id, p_member_id, p_task.points, 'task_reward', p_task.id, p_completion_id, p_actor_user_id);
  end if;
end;
$$;

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

-- Re-created with a numeric amount (was integer) — see admin_rpc.sql for the
-- original; behavior is unchanged.
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

-- redeem_reward / validate_reward_redemption: balance re-check fixed to
-- exclude 'project_contribution' rows, same reasoning as transfer_points —
-- those points belong to the project pool, never to the personal wallet
-- they were technically posted against for audit purposes.
create or replace function redeem_reward(
  p_reward_id uuid,
  p_member_id uuid
) returns reward_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward rewards;
  v_balance numeric;
  v_redemption reward_redemptions;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_reward from rewards where id = p_reward_id and is_active = true;
  if v_reward is null then
    raise exception 'reward_not_found';
  end if;

  if not exists (select 1 from circle_members where id = p_member_id and circle_id = v_reward.circle_id) then
    raise exception 'member_not_in_circle';
  end if;

  if not (
    exists (select 1 from circle_members where id = p_member_id and user_id = v_uid)
    or can_manage_member_rewards(p_member_id)
  ) then
    raise exception 'not_authorized';
  end if;

  select coalesce(sum(amount), 0) into v_balance
  from point_transactions where member_id = p_member_id and type <> 'project_contribution';
  if v_balance < v_reward.cost_points then
    raise exception 'insufficient_points';
  end if;

  if v_reward.requires_validation then
    insert into reward_redemptions (reward_id, circle_id, redeemed_by_member_id, requested_by_user_id, status, points_spent)
    values (p_reward_id, v_reward.circle_id, p_member_id, v_uid, 'pending_validation', v_reward.cost_points)
    returning * into v_redemption;

    perform notify_task_validators(
      p_member_id, v_reward.circle_id, 'reward_pending_validation',
      'Récompense en attente',
      (select first_name from circle_members where id = p_member_id) || ' souhaite utiliser "' || v_reward.name || '"',
      jsonb_build_object('reward_id', p_reward_id, 'redemption_id', v_redemption.id),
      v_uid
    );
  else
    insert into reward_redemptions (
      reward_id, circle_id, redeemed_by_member_id, requested_by_user_id, status, points_spent,
      validated_at, validated_by_user_id
    ) values (
      p_reward_id, v_reward.circle_id, p_member_id, v_uid, 'approved', v_reward.cost_points, now(), v_uid
    ) returning * into v_redemption;

    insert into point_transactions (circle_id, member_id, amount, type, reward_redemption_id, created_by_user_id)
    values (v_reward.circle_id, p_member_id, -v_reward.cost_points, 'reward_purchase', v_redemption.id, v_uid);

    insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, reward_id, points, metadata)
    values (
      v_reward.circle_id, 'reward_redeemed', p_member_id, v_uid, p_member_id, p_reward_id, -v_reward.cost_points,
      jsonb_build_object('name', v_reward.name)
    );
  end if;

  return v_redemption;
end;
$$;

create or replace function validate_reward_redemption(
  p_redemption_id uuid,
  p_approve boolean
) returns reward_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption reward_redemptions;
  v_reward rewards;
  v_balance numeric;
  v_uid uuid := auth.uid();
  v_validator_member_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_redemption from reward_redemptions where id = p_redemption_id for update;
  if v_redemption is null then
    raise exception 'redemption_not_found';
  end if;
  if v_redemption.status <> 'pending_validation' then
    raise exception 'redemption_not_pending';
  end if;
  if not can_manage_member_rewards(v_redemption.redeemed_by_member_id) then
    raise exception 'not_authorized';
  end if;

  select * into v_reward from rewards where id = v_redemption.reward_id;
  v_validator_member_id := my_member_id(v_redemption.circle_id);

  if p_approve then
    select coalesce(sum(amount), 0) into v_balance
    from point_transactions where member_id = v_redemption.redeemed_by_member_id and type <> 'project_contribution';
    if v_balance < v_redemption.points_spent then
      raise exception 'insufficient_points';
    end if;

    update reward_redemptions
      set status = 'approved', validated_at = now(), validated_by_user_id = v_uid, validated_by_member_id = v_validator_member_id
      where id = p_redemption_id
      returning * into v_redemption;

    insert into point_transactions (circle_id, member_id, amount, type, reward_redemption_id, created_by_user_id)
    values (v_redemption.circle_id, v_redemption.redeemed_by_member_id, -v_redemption.points_spent, 'reward_purchase', v_redemption.id, v_uid);

    insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, reward_id, points, metadata)
    values (
      v_redemption.circle_id, 'reward_redeemed', v_redemption.redeemed_by_member_id, v_uid, v_redemption.redeemed_by_member_id,
      v_redemption.reward_id, -v_redemption.points_spent, jsonb_build_object('name', v_reward.name)
    );

    perform notify_member_or_guardians(
      v_redemption.redeemed_by_member_id, v_redemption.circle_id, 'reward_redeemed',
      'Récompense validée', '"' || v_reward.name || '" a été validée',
      jsonb_build_object('reward_id', v_redemption.reward_id)
    );
  else
    update reward_redemptions
      set status = 'rejected', validated_at = now(), validated_by_user_id = v_uid, validated_by_member_id = v_validator_member_id
      where id = p_redemption_id
      returning * into v_redemption;
  end if;

  return v_redemption;
end;
$$;

-- ---------------------------------------------------------------------
-- Project promise votes & completion
-- ---------------------------------------------------------------------

create or replace function cast_promise_vote(p_project_id uuid, p_confirmed boolean)
returns project_promise_votes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_project projects;
  v_member_id uuid;
  v_vote project_promise_votes;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_project from projects where id = p_project_id;
  if v_project is null then
    raise exception 'project_not_found';
  end if;
  if v_project.promise_description is null then
    raise exception 'no_promise_on_this_project';
  end if;

  v_member_id := my_member_id(v_project.circle_id);
  if v_member_id is null then
    raise exception 'not_a_member';
  end if;
  if v_member_id = v_project.created_by_member_id then
    raise exception 'creator_cannot_vote_on_own_promise';
  end if;
  if not exists (select 1 from project_members where project_id = p_project_id and member_id = v_member_id) then
    raise exception 'not_a_project_participant';
  end if;

  insert into project_promise_votes (project_id, member_id, confirmed)
  values (p_project_id, v_member_id, p_confirmed)
  on conflict (project_id, member_id) do update set confirmed = excluded.confirmed, updated_at = now()
  returning * into v_vote;

  return v_vote;
end;
$$;

-- Marks a project completed, pays the +5 participation bonus to every
-- participant exactly once, and — if the project carried a promise and the
-- OTHER members' votes confirm it — pays the creator +10 on top of that.
create or replace function complete_project(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_project projects;
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

grant execute on all functions in schema public to authenticated;
