-- DoneKin schema — 29: admin rewards management, wider search, anti-abuse visibility
--
-- Three additions to the back office, all read-only extensions plus one new
-- mutation:
--
-- 1. Rewards/redemptions were the one circle sub-resource with zero admin
--    visibility (tasks and projects already got this treatment). Extends
--    admin_get_circle_detail with `rewards` and `redemptions`, and adds
--    admin_cancel_redemption() to reverse an already-approved redemption —
--    refunds the member via the ledger's dormant 'refund' transaction type
--    and flips the redemption to the dormant 'cancelled' status, both of
--    which existed in the schema from day one but were never used by any
--    code path until now.
--
-- 2. The self-task daily cap (previous migration) fails completely silently
--    — nothing recorded it happening, so an admin had no way to tell a
--    well-calibrated cap from one triggering constantly. Rather than add a
--    new log table, this derives cap-hits from data that already exists: a
--    self-task completion is 'approved' the instant it's submitted
--    regardless of the cap, so any approved self-task completion with no
--    matching 'task_reward' point_transactions row was one the cap blocked.
--    Surfaced per-member on the circle page (self_task_cap_hits_7d) and as
--    a global counter on the dashboard (self_task_cap_hits_period).
--
-- 3. admin_global_search covered users/members/circles only; extended to
--    also match projects/tasks/rewards by title/name, so a support ticket
--    referencing any of those can be found without knowing which circle
--    it's in.

-- ---------------------------------------------------------------------
-- Rewards: cancel + refund an approved redemption (dispute correction).
-- ---------------------------------------------------------------------

create or replace function admin_cancel_redemption(p_redemption_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption reward_redemptions;
begin
  perform require_platform_role('super_admin', 'admin');

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;

  select * into v_redemption from reward_redemptions where id = p_redemption_id for update;
  if v_redemption is null then
    raise exception 'redemption_not_found';
  end if;
  if v_redemption.status <> 'approved' then
    raise exception 'redemption_not_cancellable';
  end if;

  update reward_redemptions set status = 'cancelled' where id = p_redemption_id;

  insert into point_transactions (circle_id, member_id, amount, type, reward_redemption_id, created_by_user_id, metadata)
  values (
    v_redemption.circle_id, v_redemption.redeemed_by_member_id, v_redemption.points_spent, 'refund',
    p_redemption_id, auth.uid(), jsonb_build_object('reason', p_reason)
  );

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason, metadata)
  values (
    auth.uid(), 'REDEMPTION_CANCELLED', 'reward_redemption', p_redemption_id, p_reason,
    jsonb_build_object('points_refunded', v_redemption.points_spent)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Dashboard: add the global anti-abuse counter for the selected period.
-- ---------------------------------------------------------------------

create or replace function admin_get_dashboard_stats(p_period text default '7d')
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_since timestamptz;
  v_result jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  v_since := now() - (case p_period
    when '24h' then interval '1 day'
    when '7d' then interval '7 days'
    when '30d' then interval '30 days'
    when '90d' then interval '90 days'
    else interval '7 days'
  end);

  select jsonb_build_object(
    'users_total', (select count(*) from profiles where status <> 'deleted'),
    'circles_total', (select count(*) from circles where archived_at is null),
    'members_total', (select count(*) from circle_members where archived_at is null),
    'tasks_created_total', (select count(*) from tasks),
    'tasks_completed_total', (select count(*) from tasks where status = 'completed'),
    'new_accounts_today', (select count(*) from profiles where created_at >= date_trunc('day', now())),
    'new_accounts_period', (select count(*) from profiles where created_at >= v_since),
    'new_circles_period', (select count(*) from circles where created_at >= v_since),
    'tasks_created_period', (select count(*) from tasks where created_at >= v_since),
    'tasks_completed_period', (
      select count(*) from task_completions where status = 'approved' and validated_at >= v_since
    ),
    'active_users_period', (
      select count(distinct actor_user_id) from activity_events
      where created_at >= v_since and actor_user_id is not null
    ),
    'points_redeemed_period', (
      select coalesce(sum(-amount), 0) from point_transactions
      where type = 'reward_purchase' and created_at >= v_since
    ),
    'self_task_cap_hits_period', (
      select count(*)
      from task_completions tc
      join tasks t on t.id = tc.task_id
      where t.assigned_to_member_id = t.created_by_member_id
        and tc.status = 'approved'
        and tc.submitted_at >= v_since
        and not exists (
          select 1 from point_transactions pt
          where pt.task_completion_id = tc.id and pt.type = 'task_reward'
        )
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- Circle detail: add rewards, recent redemptions, and per-member cap-hit
-- visibility.
-- ---------------------------------------------------------------------

create or replace function admin_get_circle_detail(p_circle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_circle circles;
  v_result jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  select * into v_circle from circles where id = p_circle_id;
  if v_circle is null then
    raise exception 'circle_not_found';
  end if;

  select jsonb_build_object(
    'circle', row_to_json(v_circle),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', cm.id, 'first_name', cm.first_name, 'last_name', cm.last_name,
        'role', cm.role, 'member_type', cm.member_type, 'access_mode', cm.access_mode,
        'has_phone', cm.has_phone, 'user_id', cm.user_id,
        'linked_email', prof.email,
        'guardians', (
          select coalesce(jsonb_agg(jsonb_build_object('member_id', g.id, 'first_name', g.first_name)), '[]'::jsonb)
          from guardian_relationships gr
          join circle_members g on g.id = gr.guardian_member_id
          where gr.managed_member_id = cm.id
        ),
        'balance', (select coalesce(sum(amount), 0) from point_transactions pt where pt.member_id = cm.id),
        'self_task_cap_hits_7d', (
          select count(*)
          from task_completions tc
          join tasks t on t.id = tc.task_id
          where t.assigned_to_member_id = cm.id
            and t.created_by_member_id = cm.id
            and tc.status = 'approved'
            and tc.submitted_at >= now() - interval '7 days'
            and not exists (
              select 1 from point_transactions pt
              where pt.task_completion_id = tc.id and pt.type = 'task_reward'
            )
        )
      ) order by cm.joined_at), '[]'::jsonb)
      from circle_members cm
      left join profiles prof on prof.id = cm.user_id
      where cm.circle_id = p_circle_id
    ),
    'projects', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'title', p.title, 'status', p.status, 'target_points', p.target_points,
        'balance', (
          select coalesce(sum(amount), 0) from point_transactions pt
          where pt.project_id = p.id and pt.type = 'project_contribution'
        )
      ) order by p.created_at desc), '[]'::jsonb)
      from projects p
      where p.circle_id = p_circle_id and p.archived_at is null
    ),
    'rewards', (
      select coalesce(jsonb_agg(row_to_json(rw)), '[]'::jsonb)
      from (
        select id, name, cost_points, is_active
        from rewards
        where circle_id = p_circle_id and archived_at is null
        order by created_at desc
      ) rw
    ),
    'redemptions', (
      select coalesce(jsonb_agg(row_to_json(rd)), '[]'::jsonb)
      from (
        select rr.id, rw.name as reward_name, cm.first_name as member_name, rr.status, rr.points_spent, rr.created_at
        from reward_redemptions rr
        join rewards rw on rw.id = rr.reward_id
        join circle_members cm on cm.id = rr.redeemed_by_member_id
        where rr.circle_id = p_circle_id
        order by rr.created_at desc
        limit 20
      ) rd
    ),
    'projects_count', (select count(*) from projects where circle_id = p_circle_id),
    'tasks_count', (select count(*) from tasks where circle_id = p_circle_id),
    'tasks_completed_count', (select count(*) from tasks where circle_id = p_circle_id and status = 'completed'),
    'rewards_count', (select count(*) from rewards where circle_id = p_circle_id),
    'point_transactions_count', (select count(*) from point_transactions where circle_id = p_circle_id),
    'pending_invitations', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'email', email, 'expires_at', expires_at)), '[]'::jsonb)
      from invitations where circle_id = p_circle_id and status = 'pending'
    ),
    'recent_activity', (
      select coalesce(jsonb_agg(row_to_json(a)), '[]'::jsonb)
      from (
        select type, points, metadata, created_at from activity_events
        where circle_id = p_circle_id order by created_at desc limit 15
      ) a
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- Global search: also match projects, tasks, and rewards.
-- ---------------------------------------------------------------------

create or replace function admin_global_search(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result jsonb;
  v_like text := '%' || p_query || '%';
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  select jsonb_build_object(
    'users', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'full_name', full_name, 'email', email)), '[]'::jsonb)
      from (
        select id, full_name, email from profiles
        where full_name ilike v_like or email ilike v_like or id::text = p_query
        limit 8
      ) u
    ),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', cm.id, 'first_name', cm.first_name, 'circle_id', cm.circle_id,
        'circle_name', c.name, 'access_mode', cm.access_mode
      )), '[]'::jsonb)
      from (
        select * from circle_members
        where first_name ilike v_like or id::text = p_query
        limit 8
      ) cm
      join circles c on c.id = cm.circle_id
    ),
    'circles', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'type', type)), '[]'::jsonb)
      from (
        select id, name, type from circles
        where name ilike v_like or id::text = p_query
        limit 8
      ) c
    ),
    'projects', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'circle_id', circle_id)), '[]'::jsonb)
      from (
        select id, title, circle_id from projects
        where title ilike v_like or id::text = p_query
        limit 8
      ) pr
    ),
    'tasks', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'circle_id', circle_id)), '[]'::jsonb)
      from (
        select id, title, circle_id from tasks
        where title ilike v_like or id::text = p_query
        limit 8
      ) tk
    ),
    'rewards', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'circle_id', circle_id)), '[]'::jsonb)
      from (
        select id, name, circle_id from rewards
        where name ilike v_like or id::text = p_query
        limit 8
      ) rwd
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on all functions in schema public to authenticated;
