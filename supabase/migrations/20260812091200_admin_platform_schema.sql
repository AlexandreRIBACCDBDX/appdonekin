-- DoneKin schema — 14: platform admin schema
--
-- This is a SEPARATE authority system from circle roles. Owning/administering
-- a circle (parent, owner, admin of "Famille Martin") grants zero platform
-- privileges — being a DoneKin platform admin is an entirely independent
-- grant recorded here, never inferred from circle membership.

create type platform_role as enum ('super_admin', 'admin', 'support', 'moderator', 'read_only');

create table platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role platform_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  last_login_at timestamptz,
  unique (user_id)
);

comment on table platform_admins is 'DoneKin staff with back-office access. Unrelated to circle_members.role.';

create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

comment on table admin_audit_logs is 'Immutable trail of every sensitive back-office action. Never editable from the frontend.';

create index admin_audit_logs_admin_idx on admin_audit_logs(admin_user_id, created_at desc);
create index admin_audit_logs_target_idx on admin_audit_logs(target_type, target_id);
create index admin_audit_logs_action_idx on admin_audit_logs(action);

create table feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- Sensible P0 defaults — DoneKin ships with these features already on.
insert into feature_flags (key, enabled, description) values
  ('rewards_enabled', true, 'Rewards / redemptions feature'),
  ('projects_enabled', true, 'Collaborative projects feature'),
  ('point_transfers_enabled', true, 'Member-to-member point transfers'),
  ('push_notifications_enabled', false, 'Expo push notifications (P2, not yet implemented client-side)'),
  ('social_reactions_enabled', false, 'Reactions/comments on the activity feed (future)');

create table platform_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- Account-level status, independent of any circle. A suspended account
-- keeps every bit of its data (circles, points, history) — it simply loses
-- access, enforced by the hardened membership checks in the next migration.
create type profile_status as enum ('active', 'suspended', 'disabled', 'deleted');

alter table profiles add column status profile_status not null default 'active';
alter table profiles add column status_changed_at timestamptz;

-- Admin-driven suspension, kept distinct from the user-driven archived_at
-- (archiving a circle is something an owner does; suspending is a platform action).
alter table circles add column suspended_at timestamptz;
