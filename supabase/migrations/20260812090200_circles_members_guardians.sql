-- DoneKin schema — 03: circles, circle_members, guardian_relationships
--
-- circle_members is the real core entity of DoneKin ("Member Profile").
-- user_id is NULLABLE on purpose: a member with no account (e.g. a young
-- child) is a first-class row here, with its own avatar/points/history,
-- simply with access_mode = 'guardian_managed' and user_id = null.

create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  type circle_type not null default 'family',
  avatar_url text,
  created_by_user_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index circles_created_by_idx on circles(created_by_user_id);

create table circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  first_name text not null check (char_length(trim(first_name)) between 1 and 60),
  last_name text,
  avatar_url text,
  member_type member_type not null default 'other',
  role circle_role not null default 'member',
  access_mode access_mode not null default 'guardian_managed',
  has_phone boolean not null default true,
  birth_date date,
  created_by_user_id uuid not null references profiles(id),
  joined_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on column circle_members.user_id is 'Nullable: null means this member has no personal DoneKin account (guardian-managed).';
comment on column circle_members.has_phone is 'Informational only — distinct from access_mode. A member can have a phone but still be guardian-managed until they claim their account.';

-- A given account can only have one member row per circle.
create unique index circle_members_unique_user_per_circle
  on circle_members (circle_id, user_id) where user_id is not null;

create index circle_members_circle_id_idx on circle_members(circle_id) where archived_at is null;
create index circle_members_user_id_idx on circle_members(user_id) where user_id is not null;

create table guardian_relationships (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  guardian_member_id uuid not null references circle_members(id) on delete cascade,
  managed_member_id uuid not null references circle_members(id) on delete cascade,
  relationship_type text not null default 'parent',
  can_manage_tasks boolean not null default true,
  can_validate_tasks boolean not null default true,
  can_manage_rewards boolean not null default true,
  can_edit_profile boolean not null default true,
  created_by_user_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  constraint guardian_relationships_not_self check (guardian_member_id <> managed_member_id),
  constraint guardian_relationships_unique unique (guardian_member_id, managed_member_id)
);

comment on table guardian_relationships is 'Many-to-many: a managed member can have several guardians, a guardian can manage several members.';

create index guardian_relationships_circle_idx on guardian_relationships(circle_id);
create index guardian_relationships_guardian_idx on guardian_relationships(guardian_member_id);
create index guardian_relationships_managed_idx on guardian_relationships(managed_member_id);
