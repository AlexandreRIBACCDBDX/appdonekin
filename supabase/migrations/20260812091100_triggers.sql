-- DoneKin schema — 12: defense-in-depth triggers
--
-- RLS is row-level, not column-level: the UPDATE policies on circle_members
-- and tasks let an authorized user touch the row at all, but say nothing
-- about WHICH columns. Without these triggers, e.g. any circle admin could
-- directly UPDATE circle_members SET user_id = <their own uid> on someone
-- else's row and hijack that identity, or move a task into a circle they
-- don't belong to. current_user is 'authenticated' for ordinary client
-- requests and the function-owner role for SECURITY DEFINER RPCs, so these
-- triggers block direct client writes to sensitive columns while leaving
-- the RPCs in the previous migration (which legitimately set them) free.

create or replace function protect_circle_member_sensitive_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' then
    if new.user_id is distinct from old.user_id then
      raise exception 'user_id can only change via accept_invitation()';
    end if;
    if new.access_mode is distinct from old.access_mode then
      raise exception 'access_mode can only change via accept_invitation()';
    end if;
    if new.circle_id is distinct from old.circle_id then
      raise exception 'circle_id cannot be changed';
    end if;
    if new.role is distinct from old.role then
      if new.role = 'owner' or old.role = 'owner' then
        raise exception 'ownership transfer is not supported via direct update';
      end if;
      if not is_circle_admin(old.circle_id) then
        raise exception 'only circle admins can change roles';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger circle_members_protect_sensitive
  before update on circle_members
  for each row execute function protect_circle_member_sensitive_fields();

create or replace function protect_immutable_audit_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' then
    if new.circle_id is distinct from old.circle_id then
      raise exception 'circle_id cannot be changed';
    end if;
    if new.created_by_user_id is distinct from old.created_by_user_id then
      raise exception 'created_by_user_id cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_protect_immutable
  before update on tasks
  for each row execute function protect_immutable_audit_fields();

create trigger projects_protect_immutable
  before update on projects
  for each row execute function protect_immutable_audit_fields();

create trigger rewards_protect_immutable
  before update on rewards
  for each row execute function protect_immutable_audit_fields();

-- Notify on reassignment when a client directly updates a task's assignee
-- (task creation already notifies via create_task()).
create or replace function notify_on_task_reassignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to_member_id is not null
     and new.assigned_to_member_id is distinct from old.assigned_to_member_id then
    perform notify_member_or_guardians(
      new.assigned_to_member_id, new.circle_id, 'task_assigned',
      'Nouvelle tâche', new.title,
      jsonb_build_object('task_id', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger tasks_notify_reassignment
  after update on tasks
  for each row execute function notify_on_task_reassignment();

grant execute on all functions in schema public to authenticated;
