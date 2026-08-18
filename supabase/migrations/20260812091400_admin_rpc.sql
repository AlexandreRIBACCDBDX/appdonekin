-- DoneKin schema — 16: admin RPC functions
--
-- Design: the Next.js back office authenticates admins through the SAME
-- Supabase Auth as the mobile app (anon key + user session) — there is no
-- service_role_key anywhere in this file or in application code. Every
-- function here re-checks is_platform_admin()/require_platform_role()
-- itself, so the back office can never become a silent bypass of DoneKin's
-- business rules (spec section 90): reads only ever return what the RPC
-- explicitly selects, and every mutation is paired with an admin_audit_logs
-- row in the same transaction.

-- ---------------------------------------------------------------------
-- Dashboard
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
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- Global search
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
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------

create or replace function admin_list_users(
  p_search text default null,
  p_status profile_status default null,
  p_page int default 1,
  p_page_size int default 25
) returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_offset int := greatest(p_page - 1, 0) * p_page_size;
  v_total int;
  v_items jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  select count(*) into v_total
  from profiles p
  where (p_search is null or p.full_name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%')
    and (p_status is null or p.status = p_status);

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_items
  from (
    select
      p.id, p.full_name, p.email, p.status, p.created_at,
      (select max(cm.joined_at) from circle_members cm where cm.user_id = p.id) as last_circle_activity,
      (select count(*) from circle_members cm where cm.user_id = p.id and cm.archived_at is null) as circle_count
    from profiles p
    where (p_search is null or p.full_name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%')
      and (p_status is null or p.status = p_status)
    order by p.created_at desc
    limit p_page_size offset v_offset
  ) r;

  return jsonb_build_object('items', v_items, 'total', v_total, 'page', p_page, 'page_size', p_page_size);
end;
$$;

create or replace function admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_profile profiles;
  v_result jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  select * into v_profile from profiles where id = p_user_id;
  if v_profile is null then
    raise exception 'user_not_found';
  end if;

  select jsonb_build_object(
    'profile', row_to_json(v_profile),
    'memberships', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'member_id', cm.id, 'circle_id', cm.circle_id, 'circle_name', c.name,
        'circle_type', c.type, 'role', cm.role, 'member_type', cm.member_type,
        'joined_at', cm.joined_at
      )), '[]'::jsonb)
      from circle_members cm
      join circles c on c.id = cm.circle_id
      where cm.user_id = p_user_id
    ),
    'invitations_sent', (
      select count(*) from invitations where invited_by_user_id = p_user_id
    ),
    'tasks_created', (select count(*) from tasks where created_by_user_id = p_user_id),
    'recent_admin_actions', (
      select coalesce(jsonb_agg(row_to_json(l)), '[]'::jsonb)
      from (
        select action, reason, created_at, admin_user_id
        from admin_audit_logs
        where target_type = 'profile' and target_id = p_user_id
        order by created_at desc
        limit 20
      ) l
    )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function admin_suspend_user(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin', 'admin');

  update profiles set status = 'suspended', status_changed_at = now() where id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason)
  values (auth.uid(), 'USER_SUSPENDED', 'profile', p_user_id, p_reason);
end;
$$;

create or replace function admin_reactivate_user(p_user_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin', 'admin');

  update profiles set status = 'active', status_changed_at = now() where id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason)
  values (auth.uid(), 'USER_REACTIVATED', 'profile', p_user_id, p_reason);
end;
$$;

-- ---------------------------------------------------------------------
-- Circles
-- ---------------------------------------------------------------------

create or replace function admin_list_circles(
  p_search text default null,
  p_type circle_type default null,
  p_page int default 1,
  p_page_size int default 25
) returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_offset int := greatest(p_page - 1, 0) * p_page_size;
  v_total int;
  v_items jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  select count(*) into v_total
  from circles c
  where (p_search is null or c.name ilike '%' || p_search || '%')
    and (p_type is null or c.type = p_type);

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_items
  from (
    select
      c.id, c.name, c.type, c.created_at, c.archived_at, c.suspended_at,
      owner.full_name as owner_name,
      (select count(*) from circle_members m where m.circle_id = c.id and m.archived_at is null) as member_count,
      (select count(*) from tasks t where t.circle_id = c.id) as task_count
    from circles c
    left join circle_members om on om.circle_id = c.id and om.role = 'owner'
    left join profiles owner on owner.id = om.user_id
    where (p_search is null or c.name ilike '%' || p_search || '%')
      and (p_type is null or c.type = p_type)
    order by c.created_at desc
    limit p_page_size offset v_offset
  ) r;

  return jsonb_build_object('items', v_items, 'total', v_total, 'page', p_page, 'page_size', p_page_size);
end;
$$;

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
      )), '[]'::jsonb)
      from circle_members cm
      left join profiles prof on prof.id = cm.user_id
      where cm.circle_id = p_circle_id
      order by cm.joined_at
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

create or replace function admin_suspend_circle(p_circle_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin', 'admin');

  update circles set suspended_at = now() where id = p_circle_id;
  if not found then
    raise exception 'circle_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason)
  values (auth.uid(), 'CIRCLE_SUSPENDED', 'circle', p_circle_id, p_reason);
end;
$$;

create or replace function admin_reactivate_circle(p_circle_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin', 'admin');

  update circles set suspended_at = null where id = p_circle_id;
  if not found then
    raise exception 'circle_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason)
  values (auth.uid(), 'CIRCLE_REACTIVATED', 'circle', p_circle_id, p_reason);
end;
$$;

-- ---------------------------------------------------------------------
-- Diagnostics — trace a single task from assignment to points credited.
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
      )), '[]'::jsonb)
      from task_completions tc
      left join circle_members performer on performer.id = tc.performed_by_member_id
      left join profiles recorder on recorder.id = tc.recorded_by_user_id
      left join circle_members validator on validator.id = tc.validated_by_member_id
      where tc.task_id = p_task_id
      order by tc.submitted_at
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
-- Points: admin adjustment — always through the ledger, always audited.
-- ---------------------------------------------------------------------

create or replace function admin_adjust_points(p_member_id uuid, p_amount integer, p_reason text)
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
-- Invitations
-- ---------------------------------------------------------------------

create or replace function admin_list_invitations(
  p_circle_id uuid default null,
  p_status invitation_status default null,
  p_page int default 1,
  p_page_size int default 25
) returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_offset int := greatest(p_page - 1, 0) * p_page_size;
  v_total int;
  v_items jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  select count(*) into v_total
  from invitations i
  where (p_circle_id is null or i.circle_id = p_circle_id)
    and (p_status is null or i.status = p_status);

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_items
  from (
    select i.id, i.circle_id, c.name as circle_name, i.email, i.proposed_role,
           inviter.full_name as invited_by, i.status, i.created_at, i.expires_at
    from invitations i
    join circles c on c.id = i.circle_id
    left join profiles inviter on inviter.id = i.invited_by_user_id
    where (p_circle_id is null or i.circle_id = p_circle_id)
      and (p_status is null or i.status = p_status)
    order by i.created_at desc
    limit p_page_size offset v_offset
  ) r;

  return jsonb_build_object('items', v_items, 'total', v_total, 'page', p_page, 'page_size', p_page_size);
end;
$$;

create or replace function admin_revoke_invitation(p_invitation_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin', 'admin', 'support');

  update invitations set status = 'revoked', updated_at = now() where id = p_invitation_id;
  if not found then
    raise exception 'invitation_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason)
  values (auth.uid(), 'INVITATION_REVOKED', 'invitation', p_invitation_id, p_reason);
end;
$$;

create or replace function admin_resend_invitation(p_invitation_id uuid)
returns invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation invitations;
begin
  perform require_platform_role('super_admin', 'admin', 'support');

  update invitations
    set token = encode(gen_random_bytes(24), 'hex'),
        status = 'pending',
        expires_at = now() + interval '7 days',
        updated_at = now()
    where id = p_invitation_id
    returning * into v_invitation;

  if v_invitation is null then
    raise exception 'invitation_not_found';
  end if;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id)
  values (auth.uid(), 'INVITATION_RESENT', 'invitation', p_invitation_id);

  return v_invitation;
end;
$$;

-- ---------------------------------------------------------------------
-- Audit logs
-- ---------------------------------------------------------------------

create or replace function admin_list_audit_logs(
  p_admin_user_id uuid default null,
  p_action text default null,
  p_target_type text default null,
  p_page int default 1,
  p_page_size int default 50
) returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_offset int := greatest(p_page - 1, 0) * p_page_size;
  v_total int;
  v_items jsonb;
begin
  perform require_platform_role('super_admin', 'admin');

  select count(*) into v_total
  from admin_audit_logs l
  where (p_admin_user_id is null or l.admin_user_id = p_admin_user_id)
    and (p_action is null or l.action = p_action)
    and (p_target_type is null or l.target_type = p_target_type);

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_items
  from (
    select l.id, l.action, l.target_type, l.target_id, l.reason, l.metadata, l.created_at,
           admin.full_name as admin_name, admin.email as admin_email
    from admin_audit_logs l
    join profiles admin on admin.id = l.admin_user_id
    where (p_admin_user_id is null or l.admin_user_id = p_admin_user_id)
      and (p_action is null or l.action = p_action)
      and (p_target_type is null or l.target_type = p_target_type)
    order by l.created_at desc
    limit p_page_size offset v_offset
  ) r;

  return jsonb_build_object('items', v_items, 'total', v_total, 'page', p_page, 'page_size', p_page_size);
end;
$$;

-- ---------------------------------------------------------------------
-- Platform administrators
-- ---------------------------------------------------------------------

create or replace function admin_list_platform_admins()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_items jsonb;
begin
  perform require_platform_role('super_admin');

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into v_items
  from (
    select pa.id, pa.user_id, p.full_name, p.email, pa.role, pa.is_active,
           pa.created_at, pa.last_login_at, creator.full_name as created_by_name
    from platform_admins pa
    join profiles p on p.id = pa.user_id
    left join profiles creator on creator.id = pa.created_by
    order by pa.created_at
  ) r;

  return jsonb_build_object('items', v_items);
end;
$$;

create or replace function admin_set_platform_role(
  p_target_email text,
  p_role platform_role,
  p_is_active boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_user_id uuid;
  v_result platform_admins;
begin
  perform require_platform_role('super_admin');

  select id into v_target_user_id from profiles where email = p_target_email;
  if v_target_user_id is null then
    raise exception 'user_not_found_with_that_email';
  end if;

  insert into platform_admins (user_id, role, is_active, created_by)
  values (v_target_user_id, p_role, p_is_active, auth.uid())
  on conflict (user_id) do update set
    role = excluded.role,
    is_active = excluded.is_active
  returning * into v_result;

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'ADMIN_ROLE_CHANGED', 'profile', v_target_user_id,
    jsonb_build_object('role', p_role, 'is_active', p_is_active)
  );

  return row_to_json(v_result)::jsonb;
end;
$$;

create or replace function admin_touch_last_login()
returns void
language sql
security definer
set search_path = public
as $$
  update platform_admins set last_login_at = now() where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Feature flags & configuration
-- ---------------------------------------------------------------------

create or replace function admin_list_feature_flags()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_items jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  select coalesce(jsonb_agg(row_to_json(f)), '[]'::jsonb) into v_items
  from (select key, enabled, description, updated_at from feature_flags order by key) f;

  return jsonb_build_object('items', v_items);
end;
$$;

create or replace function admin_set_feature_flag(p_key text, p_enabled boolean, p_description text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin', 'admin');

  insert into feature_flags (key, enabled, description, updated_at, updated_by)
  values (p_key, p_enabled, p_description, now(), auth.uid())
  on conflict (key) do update set
    enabled = excluded.enabled,
    description = coalesce(excluded.description, feature_flags.description),
    updated_at = now(),
    updated_by = auth.uid();

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'FEATURE_FLAG_CHANGED', 'feature_flag', null, jsonb_build_object('key', p_key, 'enabled', p_enabled));
end;
$$;

create or replace function admin_get_config()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_items jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_items from platform_config;
  return v_items;
end;
$$;

create or replace function admin_set_config(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_platform_role('super_admin');

  insert into platform_config (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'CONFIG_CHANGED', 'platform_config', null, jsonb_build_object('key', p_key, 'value', p_value));
end;
$$;

grant execute on all functions in schema public to authenticated;
