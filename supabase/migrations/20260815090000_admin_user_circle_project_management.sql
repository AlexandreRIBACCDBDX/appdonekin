-- DoneKin schema — 26: admin user/circle edit+delete, project points adjustment
--
-- Extends the back office with three things the schema already supported
-- but the admin RPCs never exposed: editing a user's display name or a
-- circle's name/type, soft-deleting either (profiles.status = 'deleted'
-- already existed as an enum value; circles.archived_at already existed as
-- a column — neither had an admin_* entry point until now), and adjusting a
-- PROJECT's shared point pool the same audited way admin_adjust_points
-- already does for a personal wallet (for dispute/complaint corrections).
--
-- Delete is intentionally gated to super_admin only — one tier stricter
-- than suspend/modify (admin+super_admin) — since it's harder to walk back
-- from a user's perspective: deleted accounts disappear from lists the way
-- suspended ones don't.

-- ---------------------------------------------------------------------
-- Users: edit + delete
-- ---------------------------------------------------------------------

create or replace function admin_update_user(p_user_id uuid, p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin', 'admin');

  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'full_name_required';
  end if;

  update profiles set full_name = trim(p_full_name) where id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'USER_UPDATED', 'profile', p_user_id, jsonb_build_object('full_name', p_full_name));
end;
$$;

create or replace function admin_delete_user(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin');

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;

  update profiles set status = 'deleted', status_changed_at = now() where id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason)
  values (auth.uid(), 'USER_DELETED', 'profile', p_user_id, p_reason);
end;
$$;

-- ---------------------------------------------------------------------
-- Circles: edit + delete/restore
-- ---------------------------------------------------------------------

create or replace function admin_update_circle(p_circle_id uuid, p_name text, p_type circle_type default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin', 'admin');

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required';
  end if;

  update circles
  set name = trim(p_name),
      type = coalesce(p_type, type)
  where id = p_circle_id;
  if not found then
    raise exception 'circle_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'CIRCLE_UPDATED', 'circle', p_circle_id, jsonb_build_object('name', p_name, 'type', p_type));
end;
$$;

create or replace function admin_delete_circle(p_circle_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin');

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;

  update circles set archived_at = now() where id = p_circle_id;
  if not found then
    raise exception 'circle_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason)
  values (auth.uid(), 'CIRCLE_DELETED', 'circle', p_circle_id, p_reason);
end;
$$;

create or replace function admin_restore_circle(p_circle_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin');

  update circles set archived_at = null where id = p_circle_id;
  if not found then
    raise exception 'circle_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason)
  values (auth.uid(), 'CIRCLE_RESTORED', 'circle', p_circle_id, p_reason);
end;
$$;

-- ---------------------------------------------------------------------
-- Projects: admin point adjustment (dispute/correction), mirrors
-- admin_adjust_points but credits the project's shared pool instead of a
-- member's personal wallet. Attributed to the project's creator purely for
-- ledger lineage — 'project_contribution' rows never affect a member's own
-- balance (member_wallets excludes that type), only project_wallets does.
-- ---------------------------------------------------------------------

create or replace function admin_adjust_project_points(p_project_id uuid, p_amount numeric, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
  v_member_id uuid;
  v_title text;
begin
  perform require_platform_role('super_admin', 'admin');

  if p_amount = 0 then
    raise exception 'invalid_amount';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;

  select circle_id, created_by_member_id, title into v_circle_id, v_member_id, v_title
  from projects where id = p_project_id;
  if v_circle_id is null then
    raise exception 'project_not_found';
  end if;

  insert into point_transactions (circle_id, member_id, amount, type, project_id, created_by_user_id, metadata)
  values (
    v_circle_id, v_member_id, p_amount, 'project_contribution', p_project_id, auth.uid(),
    jsonb_build_object('reason', p_reason, 'admin_adjustment', true)
  );

  insert into activity_events (circle_id, type, actor_user_id, subject_member_id, project_id, points, metadata)
  values (
    v_circle_id, 'admin_adjustment', auth.uid(), v_member_id, p_project_id, p_amount,
    jsonb_build_object('reason', p_reason, 'title', v_title)
  );

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason, metadata)
  values (auth.uid(), 'PROJECT_POINTS_ADJUSTED', 'project', p_project_id, p_reason, jsonb_build_object('amount', p_amount));
end;
$$;

-- ---------------------------------------------------------------------
-- Task completion chain: same latent bug as admin_get_circle_detail's
-- members list above — jsonb_agg(...) combined with a query-level ORDER BY
-- on a column outside the aggregate is invalid once Postgres treats the
-- query as grouped. Never caught before because this diagnostic tool had
-- apparently never been exercised against a real database. Fix: move the
-- ORDER BY inside the aggregate call itself.
-- ---------------------------------------------------------------------

create or replace function admin_get_task_completion_chain(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  select jsonb_build_object(
    'task', row_to_json(t),
    'assigned_to', assignee.first_name,
    'completions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', tc.id,
        'status', tc.status,
        'performed_by', performer.first_name,
        'recorded_by', recorder.full_name,
        'validated_by', validator.first_name,
        'points_awarded', tc.points_awarded,
        'submitted_at', tc.submitted_at,
        'validated_at', tc.validated_at
      ) order by tc.submitted_at), '[]'::jsonb)
      from task_completions tc
      left join circle_members performer on performer.id = tc.performed_by_member_id
      left join profiles recorder on recorder.id = tc.recorded_by_user_id
      left join circle_members validator on validator.id = tc.validated_by_member_id
      where tc.task_id = p_task_id
    ),
    'point_transactions', (
      select coalesce(jsonb_agg(row_to_json(pt)), '[]'::jsonb)
      from (select id, member_id, amount, type, created_at from point_transactions where task_id = p_task_id) pt
    )
  ) into v_result
  from tasks t
  left join circle_members assignee on assignee.id = t.assigned_to_member_id
  where t.id = p_task_id;

  if v_result is null then
    raise exception 'task_not_found';
  end if;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- Circle detail: surface non-archived projects (id, title, status, target,
-- pool balance) so the back office can list them for the adjustment above.
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
        'balance', (select coalesce(sum(amount), 0) from point_transactions pt where pt.member_id = cm.id)
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

grant execute on all functions in schema public to authenticated;
