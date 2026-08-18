-- DoneKin schema — 15: platform admin helpers + membership hardening
--
-- Every admin_* RPC in the next migration starts by calling one of these.
-- They are the single place that decides "is this caller allowed to touch
-- the back office at all, and with which role" — never re-derived ad hoc.

create or replace function get_platform_role()
returns platform_role
language sql
security definer
set search_path = public
stable
as $$
  select role from platform_admins
  where user_id = auth.uid() and is_active = true
  limit 1;
$$;

create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from platform_admins where user_id = auth.uid() and is_active = true
  );
$$;

-- Raises if the caller isn't an active platform admin with one of the given
-- roles. Used to gate every mutating admin_* RPC; read-only ones typically
-- only need is_platform_admin() (any active role may view).
create or replace function require_platform_role(variadic p_roles platform_role[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role platform_role;
begin
  select role into v_role from platform_admins where user_id = auth.uid() and is_active = true;
  if v_role is null then
    raise exception 'not_platform_admin';
  end if;
  if not (v_role = any(p_roles)) then
    raise exception 'insufficient_platform_role';
  end if;
end;
$$;

-- Hardening: a suspended/disabled account or a platform-suspended circle
-- loses access immediately, even with a still-valid JWT — this is enforced
-- here so every policy and RPC built on top of is_circle_member /
-- is_circle_admin inherits it automatically, with nothing to change in the
-- mobile app.
create or replace function is_circle_member(p_circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from circle_members cm
    join profiles p on p.id = cm.user_id
    join circles c on c.id = cm.circle_id
    where cm.circle_id = p_circle_id
      and cm.user_id = auth.uid()
      and cm.archived_at is null
      and p.status = 'active'
      and c.suspended_at is null
  );
$$;

create or replace function is_circle_admin(p_circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from circle_members cm
    join profiles p on p.id = cm.user_id
    join circles c on c.id = cm.circle_id
    where cm.circle_id = p_circle_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
      and cm.archived_at is null
      and p.status = 'active'
      and c.suspended_at is null
  );
$$;

alter table platform_admins enable row level security;
alter table admin_audit_logs enable row level security;
alter table feature_flags enable row level security;
alter table platform_config enable row level security;

-- No client-facing policies at all on these four tables: every read and
-- write goes through admin_* SECURITY DEFINER RPCs, which check
-- is_platform_admin()/require_platform_role() themselves. A platform admin
-- has no direct table grant — only what the RPCs choose to return.
-- (Feature flags are the one exception: the mobile/admin apps may read
-- enabled flags directly to gate UI, without needing admin rights.)
create policy feature_flags_select_anyone on feature_flags
  for select using (true);

grant execute on all functions in schema public to authenticated;
