-- DoneKin schema — 11: RPC functions
--
-- Every operation that touches points, or that creates/links identities,
-- goes through one of these SECURITY DEFINER functions. They re-check
-- permissions themselves (never trust the client), lock rows they mutate,
-- and always pair a point_transactions insert with an activity_events
-- insert so the ledger and the feed can never drift apart.

-- ---------------------------------------------------------------------
-- Circle & member lifecycle
-- ---------------------------------------------------------------------

create or replace function create_circle(
  p_name text,
  p_type circle_type,
  p_display_name text default 'Moi'
) returns circles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle circles;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into circles (name, type, created_by_user_id)
  values (p_name, p_type, v_uid)
  returning * into v_circle;

  insert into circle_members (
    circle_id, user_id, first_name, member_type, role, access_mode, has_phone, created_by_user_id
  ) values (
    v_circle.id, v_uid, p_display_name, 'parent', 'owner', 'personal_account', true, v_uid
  );

  return v_circle;
end;
$$;

create or replace function add_circle_member(
  p_circle_id uuid,
  p_first_name text,
  p_member_type member_type,
  p_birth_date date default null,
  p_has_phone boolean default false,
  p_become_guardian boolean default true
) returns circle_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_caller_member_id uuid;
  v_new_member circle_members;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_caller_member_id := my_member_id(p_circle_id);
  if v_caller_member_id is null then
    raise exception 'not_a_member';
  end if;

  if not (
    is_circle_admin(p_circle_id)
    or exists (select 1 from circle_members where id = v_caller_member_id and role = 'parent')
  ) then
    raise exception 'not_authorized';
  end if;

  insert into circle_members (
    circle_id, first_name, member_type, role, access_mode, has_phone, birth_date, created_by_user_id
  ) values (
    p_circle_id, p_first_name, p_member_type,
    (case when p_member_type = 'child' then 'child' else 'member' end)::circle_role,
    'guardian_managed', p_has_phone, p_birth_date, v_uid
  ) returning * into v_new_member;

  if p_become_guardian then
    insert into guardian_relationships (circle_id, guardian_member_id, managed_member_id, created_by_user_id)
    values (p_circle_id, v_caller_member_id, v_new_member.id, v_uid);
  end if;

  insert into audit_log (circle_id, actor_user_id, actor_member_id, action, subject_member_id, subject_type, subject_id)
  values (p_circle_id, v_uid, v_caller_member_id, 'member_added', v_new_member.id, 'circle_member', v_new_member.id);

  insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, metadata)
  values (p_circle_id, 'member_joined', v_caller_member_id, v_uid, v_new_member.id, jsonb_build_object('first_name', p_first_name));

  return v_new_member;
end;
$$;

create or replace function set_guardian_relationship(
  p_circle_id uuid,
  p_guardian_member_id uuid,
  p_managed_member_id uuid,
  p_can_manage_tasks boolean default true,
  p_can_validate_tasks boolean default true,
  p_can_manage_rewards boolean default true,
  p_can_edit_profile boolean default true
) returns guardian_relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result guardian_relationships;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not is_circle_admin(p_circle_id) then
    raise exception 'not_authorized';
  end if;
  if p_guardian_member_id = p_managed_member_id then
    raise exception 'invalid_relationship';
  end if;

  insert into guardian_relationships (
    circle_id, guardian_member_id, managed_member_id, created_by_user_id,
    can_manage_tasks, can_validate_tasks, can_manage_rewards, can_edit_profile
  ) values (
    p_circle_id, p_guardian_member_id, p_managed_member_id, v_uid,
    p_can_manage_tasks, p_can_validate_tasks, p_can_manage_rewards, p_can_edit_profile
  )
  on conflict (guardian_member_id, managed_member_id) do update set
    can_manage_tasks = excluded.can_manage_tasks,
    can_validate_tasks = excluded.can_validate_tasks,
    can_manage_rewards = excluded.can_manage_rewards,
    can_edit_profile = excluded.can_edit_profile
  returning * into v_result;

  insert into audit_log (circle_id, actor_user_id, action, subject_member_id, subject_type, subject_id, metadata)
  values (
    p_circle_id, v_uid, 'guardian_relationship_set', p_managed_member_id, 'guardian_relationship', v_result.id,
    jsonb_build_object('guardian_member_id', p_guardian_member_id)
  );

  return v_result;
end;
$$;

create or replace function remove_guardian_relationship(p_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rel guardian_relationships;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_rel from guardian_relationships where id = p_id;
  if v_rel is null then
    raise exception 'not_found';
  end if;
  if not is_circle_admin(v_rel.circle_id) then
    raise exception 'not_authorized';
  end if;

  delete from guardian_relationships where id = p_id;

  insert into audit_log (circle_id, actor_user_id, action, subject_member_id, subject_type, subject_id)
  values (v_rel.circle_id, v_uid, 'guardian_relationship_removed', v_rel.managed_member_id, 'guardian_relationship', p_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------

create or replace function create_task(
  p_circle_id uuid,
  p_title text,
  p_description text default null,
  p_assigned_to_member_id uuid default null,
  p_points integer default 0,
  p_priority task_priority default 'medium',
  p_due_date timestamptz default null,
  p_requires_validation boolean default true,
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
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_member_id := my_member_id(p_circle_id);
  if v_member_id is null then
    raise exception 'not_a_member';
  end if;

  if p_assigned_to_member_id is not null and not exists (
    select 1 from circle_members where id = p_assigned_to_member_id and circle_id = p_circle_id
  ) then
    raise exception 'assignee_not_in_circle';
  end if;

  if p_project_id is not null and not exists (
    select 1 from projects where id = p_project_id and circle_id = p_circle_id
  ) then
    raise exception 'project_not_in_circle';
  end if;

  insert into tasks (
    circle_id, project_id, title, description, assigned_to_member_id,
    created_by_member_id, created_by_user_id, priority, points, due_date,
    requires_validation, recurrence
  ) values (
    p_circle_id, p_project_id, p_title, p_description, p_assigned_to_member_id,
    v_member_id, v_uid, p_priority, greatest(p_points, 0), p_due_date,
    p_requires_validation, p_recurrence
  ) returning * into v_task;

  if p_assigned_to_member_id is not null and p_assigned_to_member_id <> v_member_id then
    perform notify_member_or_guardians(
      p_assigned_to_member_id, p_circle_id, 'task_assigned',
      'Nouvelle tâche', p_title,
      jsonb_build_object('task_id', v_task.id)
    );
  end if;

  return v_task;
end;
$$;

-- Records that p_performed_by_member_id finished a task. The caller must
-- either BE that member (self.user_id = auth.uid()) or manage them
-- (guardian/admin) — this is the "Paul opens DoneKin and says Lucas is
-- done" path from spec section 4.
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

    insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, task_id, metadata)
    values (
      v_task.circle_id, 'validation_requested', p_performed_by_member_id, v_uid, p_performed_by_member_id, p_task_id,
      jsonb_build_object('title', v_task.title)
    );

    perform notify_task_validators(
      p_performed_by_member_id, v_task.circle_id, 'validation_requested',
      'Validation demandée',
      (select first_name from circle_members where id = p_performed_by_member_id) || ' a terminé "' || v_task.title || '"',
      jsonb_build_object('task_id', p_task_id, 'completion_id', v_completion.id),
      v_uid
    );
  else
    insert into task_completions (
      task_id, circle_id, performed_by_member_id, recorded_by_user_id, status, notes,
      points_awarded, validated_at, validated_by_user_id
    ) values (
      p_task_id, v_task.circle_id, p_performed_by_member_id, v_uid, 'approved', p_notes,
      v_task.points, now(), v_uid
    ) returning * into v_completion;

    update tasks set status = 'completed' where id = p_task_id;

    if v_task.points > 0 then
      insert into point_transactions (circle_id, member_id, amount, type, task_id, task_completion_id, created_by_user_id)
      values (v_task.circle_id, p_performed_by_member_id, v_task.points, 'task_reward', p_task_id, v_completion.id, v_uid);
    end if;

    insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, task_id, points, metadata)
    values (
      v_task.circle_id, 'task_completed', p_performed_by_member_id, v_uid, p_performed_by_member_id, p_task_id, v_task.points,
      jsonb_build_object('title', v_task.title)
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
  if not can_validate_member_tasks(v_completion.performed_by_member_id) then
    raise exception 'not_authorized';
  end if;

  select * into v_task from tasks where id = v_completion.task_id for update;
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

    if v_task.points > 0 then
      insert into point_transactions (circle_id, member_id, amount, type, task_id, task_completion_id, created_by_user_id)
      values (v_task.circle_id, v_completion.performed_by_member_id, v_task.points, 'task_reward', v_task.id, v_completion.id, v_uid);
    end if;

    insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, task_id, points, metadata)
    values (
      v_task.circle_id, 'task_completed', v_completion.performed_by_member_id, v_uid, v_completion.performed_by_member_id,
      v_task.id, v_task.points, jsonb_build_object('title', v_task.title)
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

-- ---------------------------------------------------------------------
-- Rewards
-- ---------------------------------------------------------------------

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
  v_balance integer;
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

  select coalesce(sum(amount), 0) into v_balance from point_transactions where member_id = p_member_id;
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
  v_balance integer;
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
    select coalesce(sum(amount), 0) into v_balance from point_transactions where member_id = v_redemption.redeemed_by_member_id;
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
-- Points: transfers & manual bonuses
-- ---------------------------------------------------------------------

create or replace function transfer_points(
  p_circle_id uuid,
  p_to_member_id uuid,
  p_amount integer,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_member_id uuid;
  v_balance integer;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
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

  select coalesce(sum(amount), 0) into v_balance from point_transactions where member_id = v_from_member_id;
  if v_balance < p_amount then
    raise exception 'insufficient_points';
  end if;

  insert into point_transactions (circle_id, member_id, amount, type, related_member_id, created_by_user_id, metadata)
  values (p_circle_id, v_from_member_id, -p_amount, 'transfer_sent', p_to_member_id, v_uid, jsonb_build_object('note', p_note));

  insert into point_transactions (circle_id, member_id, amount, type, related_member_id, created_by_user_id, metadata)
  values (p_circle_id, p_to_member_id, p_amount, 'transfer_received', v_from_member_id, v_uid, jsonb_build_object('note', p_note));

  insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, points, metadata)
  values (p_circle_id, 'points_transferred', v_from_member_id, v_uid, p_to_member_id, p_amount, jsonb_build_object('note', p_note));

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
  p_amount integer,
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
-- Invitations
-- ---------------------------------------------------------------------

create or replace function create_invitation(
  p_circle_id uuid,
  p_email text default null,
  p_role circle_role default 'member',
  p_member_type member_type default 'friend',
  p_target_member_id uuid default null
) returns invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member_id uuid;
  v_invitation invitations;
  v_token text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_member_id := my_member_id(p_circle_id);
  if v_member_id is null then
    raise exception 'not_a_member';
  end if;

  if p_target_member_id is not null then
    if not can_edit_member_profile(p_target_member_id) then
      raise exception 'not_authorized';
    end if;
    if exists (select 1 from circle_members where id = p_target_member_id and user_id is not null) then
      raise exception 'member_already_has_account';
    end if;
  elsif p_role in ('owner', 'admin') and not is_circle_admin(p_circle_id) then
    raise exception 'not_authorized';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');

  insert into invitations (
    circle_id, invited_by_user_id, invited_by_member_id, target_member_id,
    email, proposed_role, proposed_member_type, token
  ) values (
    p_circle_id, v_uid, v_member_id, p_target_member_id,
    p_email, p_role, p_member_type, v_token
  ) returning * into v_invitation;

  return v_invitation;
end;
$$;

-- Callable by ANY authenticated user, even one with no circle membership
-- yet — that's the whole point of an invitation. Looks the row up by its
-- unbounded-entropy token rather than by circle, so RLS's "is a member"
-- rule never gets in the way of the person who is about to become one.
create or replace function accept_invitation(p_token text) returns circle_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invitation invitations;
  v_member circle_members;
  v_display_name text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invitation from invitations where token = p_token for update;
  if v_invitation is null then
    raise exception 'invalid_invitation';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception 'invitation_not_pending';
  end if;
  if v_invitation.expires_at < now() then
    update invitations set status = 'expired', updated_at = now() where id = v_invitation.id;
    raise exception 'invitation_expired';
  end if;

  if v_invitation.target_member_id is not null then
    update circle_members
      set user_id = v_uid, access_mode = 'personal_account', has_phone = true
      where id = v_invitation.target_member_id and user_id is null
      returning * into v_member;

    if v_member is null then
      raise exception 'member_already_claimed';
    end if;

    insert into audit_log (circle_id, actor_user_id, action, subject_member_id, subject_type, subject_id)
    values (v_invitation.circle_id, v_uid, 'account_linked_to_member', v_member.id, 'circle_member', v_member.id);
  else
    if exists (select 1 from circle_members where circle_id = v_invitation.circle_id and user_id = v_uid) then
      raise exception 'already_a_member';
    end if;

    select full_name into v_display_name from profiles where id = v_uid;

    insert into circle_members (
      circle_id, user_id, first_name, member_type, role, access_mode, has_phone, created_by_user_id
    ) values (
      v_invitation.circle_id, v_uid, coalesce(v_display_name, 'Membre'),
      v_invitation.proposed_member_type, v_invitation.proposed_role, 'personal_account', true,
      v_invitation.invited_by_user_id
    ) returning * into v_member;
  end if;

  update invitations
    set status = 'accepted', accepted_by_user_id = v_uid, updated_at = now()
    where id = v_invitation.id;

  insert into activity_events (circle_id, type, actor_user_id, subject_member_id, metadata)
  values (v_invitation.circle_id, 'member_joined', v_uid, v_member.id, jsonb_build_object('first_name', v_member.first_name));

  return v_member;
end;
$$;

create or replace function revoke_invitation(p_invitation_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invitation invitations;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invitation from invitations where id = p_invitation_id;
  if v_invitation is null then
    raise exception 'not_found';
  end if;
  if not (is_circle_admin(v_invitation.circle_id) or v_invitation.invited_by_user_id = v_uid) then
    raise exception 'not_authorized';
  end if;

  update invitations set status = 'revoked', updated_at = now() where id = p_invitation_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------

create or replace function mark_notification_read(p_notification_id uuid) returns void
language sql
security definer
set search_path = public
as $$
  update notifications set read_at = now()
  where id = p_notification_id and recipient_user_id = auth.uid() and read_at is null;
$$;

create or replace function mark_all_notifications_read() returns void
language sql
security definer
set search_path = public
as $$
  update notifications set read_at = now()
  where recipient_user_id = auth.uid() and read_at is null;
$$;

grant execute on all functions in schema public to authenticated;
