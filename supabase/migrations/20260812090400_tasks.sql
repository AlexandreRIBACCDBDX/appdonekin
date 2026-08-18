-- DoneKin schema — 05: tasks & task_completions
--
-- task_completions is what makes the performed_by / recorded_by distinction
-- real: performed_by_member_id is who functionally did the task (may have no
-- account), recorded_by_user_id is the account that clicked the button.

create table tasks (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text,
  assigned_to_member_id uuid references circle_members(id) on delete set null,
  created_by_member_id uuid not null references circle_members(id),
  created_by_user_id uuid not null references profiles(id),
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  points integer not null default 0 check (points >= 0),
  requires_validation boolean not null default true,
  due_date timestamptz,
  recurrence recurrence_frequency not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index tasks_circle_id_idx on tasks(circle_id);
create index tasks_assigned_to_idx on tasks(assigned_to_member_id);
create index tasks_project_id_idx on tasks(project_id) where project_id is not null;
create index tasks_circle_status_idx on tasks(circle_id, status);
create index tasks_due_date_idx on tasks(due_date) where due_date is not null;

create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create table task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  circle_id uuid not null references circles(id) on delete cascade,
  performed_by_member_id uuid not null references circle_members(id),
  recorded_by_user_id uuid not null references profiles(id),
  status completion_status not null default 'pending_validation',
  points_awarded integer,
  notes text,
  validated_by_member_id uuid references circle_members(id),
  validated_by_user_id uuid references profiles(id),
  submitted_at timestamptz not null default now(),
  validated_at timestamptz
);

comment on column task_completions.performed_by_member_id is 'Who actually did the task — the functional author, shown to other users.';
comment on column task_completions.recorded_by_user_id is 'Which logged-in account performed the click — audit trail only.';

create index task_completions_task_idx on task_completions(task_id);
create index task_completions_performed_by_idx on task_completions(performed_by_member_id);
create index task_completions_circle_idx on task_completions(circle_id, submitted_at desc);
create index task_completions_pending_idx on task_completions(circle_id) where status = 'pending_validation';
