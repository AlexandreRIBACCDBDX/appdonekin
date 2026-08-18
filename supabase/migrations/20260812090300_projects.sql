-- DoneKin schema — 04: projects

create table projects (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text,
  status project_status not null default 'active',
  due_date timestamptz,
  created_by_member_id uuid not null references circle_members(id),
  created_by_user_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index projects_circle_id_idx on projects(circle_id) where archived_at is null;

create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  member_id uuid not null references circle_members(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (project_id, member_id)
);

create index project_members_project_idx on project_members(project_id);
create index project_members_member_idx on project_members(member_id);
