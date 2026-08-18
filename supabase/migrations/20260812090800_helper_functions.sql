-- DoneKin schema — 09: security helper functions
--
-- These are the single source of truth for "can the current user see/touch
-- this?" used by both RLS policies and RPC functions below. Centralizing
-- them here means the permission model (membership, admin, guardian
-- delegation) is expressed once, not re-derived ad hoc in every policy.
--
-- They are SECURITY DEFINER + STABLE so they can safely read circle_members/
-- guardian_relationships without recursing into the RLS policies that will
-- be defined on those same tables.

create or replace function is_circle_member(p_circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from circle_members
    where circle_id = p_circle_id
      and user_id = auth.uid()
      and archived_at is null
  );
$$;

create or replace function my_member_id(p_circle_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from circle_members
  where circle_id = p_circle_id
    and user_id = auth.uid()
    and archived_at is null
  limit 1;
$$;

create or replace function is_circle_admin(p_circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from circle_members
    where circle_id = p_circle_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and archived_at is null
  );
$$;

-- True if the caller may act on tasks for p_member_id: it's themself, they
-- are a circle admin, or a guardian with can_manage_tasks.
create or replace function can_manage_member_tasks(p_member_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from circle_members m
    where m.id = p_member_id
      and (
        m.user_id = auth.uid()
        or is_circle_admin(m.circle_id)
        or exists (
          select 1 from guardian_relationships gr
          join circle_members guardian on guardian.id = gr.guardian_member_id
          where gr.managed_member_id = m.id
            and guardian.user_id = auth.uid()
            and guardian.archived_at is null
            and gr.can_manage_tasks = true
        )
      )
  );
$$;

-- True if the caller may validate/reject a task completed by p_member_id.
-- Deliberately excludes "self" — self-validation only happens through the
-- requires_validation = false fast path inside complete_task().
create or replace function can_validate_member_tasks(p_member_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from circle_members m
    where m.id = p_member_id
      and (
        is_circle_admin(m.circle_id)
        or exists (
          select 1 from guardian_relationships gr
          join circle_members guardian on guardian.id = gr.guardian_member_id
          where gr.managed_member_id = m.id
            and guardian.user_id = auth.uid()
            and guardian.archived_at is null
            and gr.can_validate_tasks = true
        )
      )
  );
$$;

create or replace function can_manage_member_rewards(p_member_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from circle_members m
    where m.id = p_member_id
      and (
        m.user_id = auth.uid()
        or is_circle_admin(m.circle_id)
        or exists (
          select 1 from guardian_relationships gr
          join circle_members guardian on guardian.id = gr.guardian_member_id
          where gr.managed_member_id = m.id
            and guardian.user_id = auth.uid()
            and guardian.archived_at is null
            and gr.can_manage_rewards = true
        )
      )
  );
$$;

create or replace function can_edit_member_profile(p_member_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from circle_members m
    where m.id = p_member_id
      and (
        m.user_id = auth.uid()
        or is_circle_admin(m.circle_id)
        or exists (
          select 1 from guardian_relationships gr
          join circle_members guardian on guardian.id = gr.guardian_member_id
          where gr.managed_member_id = m.id
            and guardian.user_id = auth.uid()
            and guardian.archived_at is null
            and gr.can_edit_profile = true
        )
      )
  );
$$;

-- Sends a notification to a member's own account if they have one,
-- otherwise fans it out to their guardians. Guardian-managed members with
-- no account simply never receive a push/in-app notification directly.
create or replace function notify_member_or_guardians(
  p_member_id uuid,
  p_circle_id uuid,
  p_type notification_type,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from circle_members where id = p_member_id;

  if v_user_id is not null then
    insert into notifications (recipient_user_id, circle_id, type, title, body, data)
    values (v_user_id, p_circle_id, p_type, p_title, p_body, p_data);
  else
    insert into notifications (recipient_user_id, circle_id, type, title, body, data)
    select guardian.user_id, p_circle_id, p_type, p_title, p_body, p_data
    from guardian_relationships gr
    join circle_members guardian on guardian.id = gr.guardian_member_id
    where gr.managed_member_id = p_member_id
      and guardian.user_id is not null;
  end if;
end;
$$;

-- Notifies everyone able to validate p_member_id's completions (circle
-- admins + their guardians-with-can_validate_tasks), excluding the actor.
create or replace function notify_task_validators(
  p_member_id uuid,
  p_circle_id uuid,
  p_type notification_type,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
  p_exclude_user_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (recipient_user_id, circle_id, type, title, body, data)
  select distinct recipient, p_circle_id, p_type, p_title, p_body, p_data
  from (
    select cm.user_id as recipient
    from circle_members cm
    where cm.circle_id = p_circle_id
      and cm.role in ('owner', 'admin')
      and cm.user_id is not null
    union
    select guardian.user_id as recipient
    from guardian_relationships gr
    join circle_members guardian on guardian.id = gr.guardian_member_id
    where gr.managed_member_id = p_member_id
      and guardian.user_id is not null
      and gr.can_validate_tasks = true
  ) recipients
  where p_exclude_user_id is null or recipient <> p_exclude_user_id;
end;
$$;

grant execute on all functions in schema public to authenticated;
